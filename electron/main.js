const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0f0f0f',
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

// IPC Handler: Open folder dialog
ipcMain.handle('dialog:openFolder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
  });
  if (result.canceled) return null;
  return result.filePaths[0];
});

// IPC Handler: Analyze folder
ipcMain.handle('folder:analyze', async (event, folderPath) => {
  const stats = {
    totalFiles: 0,
    totalSize: 0,
    fileTypes: {},
    images: [],
    folderName: path.basename(folderPath),
    parentFolder: path.basename(path.dirname(folderPath)),
  };

  function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        walkDir(filePath);
      } else {
        stats.totalFiles++;
        stats.totalSize += stat.size;
        const ext = path.extname(file).toLowerCase().replace('.', '');
        if (ext) {
          stats.fileTypes[ext] = (stats.fileTypes[ext] || 0) + 1;
        }
        // Collect images
        if (['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(path.extname(file).toLowerCase())) {
          stats.images.push(filePath);
        }
      }
    }
  }

  try {
    walkDir(folderPath);
    return stats;
  } catch (error) {
    console.error('Error analyzing folder:', error);
    return null;
  }
});

// IPC Handler: Read file as base64 (for images)
ipcMain.handle('file:readAsBase64', async (event, filePath) => {
  try {
    const data = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase().replace('.', '');
    const mimeType = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      webp: 'image/webp',
      gif: 'image/gif',
    }[ext] || 'application/octet-stream';
    return `data:${mimeType};base64,${data.toString('base64')}`;
  } catch (error) {
    console.error('Error reading file:', error);
    return null;
  }
});

// IPC Handler: RunningHub Account Status
ipcMain.handle('runninghub:accountStatus', async (event, { apiKey }) => {
  console.log('📊 [Account] Fetching account status...');

  if (!apiKey) {
    return { success: false, error: 'API Key is required' };
  }

  try {
    const response = await fetch('https://www.runninghub.ai/uc/openapi/accountStatus', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Host': 'www.runninghub.ai'
      },
      body: JSON.stringify({
        apikey: apiKey
      })
    });

    const result = await response.json();
    console.log('📦 [Account] Status Response:', JSON.stringify(result));

    if (result.code === 0 && result.data) {
      return {
        success: true,
        data: {
          remainCoins: result.data.remainCoins,
          currentTasks: result.data.currentTaskCounts,
          remainMoney: result.data.remainMoney,
          currency: result.data.currency,
          apiType: result.data.apiType
        }
      };
    } else {
      return { success: false, error: result.msg || 'Failed to fetch account status' };
    }
  } catch (error) {
    console.error('❌ [Account] Error:', error);
    return { success: false, error: error.message };
  }
});

// IPC Handler: RunningHub AI Generation
ipcMain.handle('runninghub:generate', async (event, { apiKey, workflowId, nodeInfo }) => {
  console.log('🚀 [RunningHub] Starting Generation...');
  console.log('Workflow ID:', workflowId);

  try {
    // 1. Start Task
    const runRequestBody = {
      apiKey: apiKey,
      workflowId: workflowId,
      nodeInfoList: nodeInfo.map(n => ({
        nodeId: n.node_id,
        fieldName: n.field_name,
        fieldValue: n.value
      }))
    };

    console.log('📡 [RunningHub] Sending request to API:', JSON.stringify(runRequestBody, null, 2));

    const runResponse = await fetch('https://www.runninghub.ai/task/openapi/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Host': 'www.runninghub.ai'
      },
      body: JSON.stringify(runRequestBody)
    });

    const runResult = await runResponse.json();
    console.log('📦 [RunningHub] Create Task Response:', JSON.stringify(runResult));

    if (runResult.code !== 0) {
      throw new Error(runResult.msg || 'RunningHub Start Task Error');
    }

    const taskId = runResult.data.taskId;
    console.log('🆔 [RunningHub] Task ID:', taskId);

    // 2. Poll for completion
    let attempts = 0;
    while (attempts < 60) {
      await new Promise(resolve => setTimeout(resolve, 3000)); // Every 3 seconds

      console.log(`🔍 [RunningHub] Polling Status (Attempt ${attempts + 1})...`);
      const statusResponse = await fetch('https://www.runninghub.ai/task/openapi/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Host': 'www.runninghub.ai'
        },
        body: JSON.stringify({
          apiKey: apiKey,
          taskId: taskId
        })
      });

      const statusResult = await statusResponse.json();
      console.log(`📊 [RunningHub] Status Response [${taskId}]:`, JSON.stringify(statusResult));

      if (statusResult.code === 0) {
        const data = statusResult.data;

        // Handle both string and numeric status
        let status;
        if (typeof data === 'string') {
          // String status: "QUEUED", "RUNNING", "SUCCESS", "FAILED"
          status = data;
        } else if (typeof data === 'object' && data.status !== undefined) {
          status = data.status;
        }

        console.log(`✨ [RunningHub] Current Status: ${status}`);

        // Check for success (both string "SUCCESS" and numeric 2)
        if (status === 'SUCCESS' || status === 2) {
          console.log('✅ [RunningHub] Task Successful! Extracting results...');

          let resultData = (typeof data === 'object' ? (data.taskResult || data) : null);
          let resultText = null;

          // If current status data isn't what we need, fetch from outputs
          if (!resultData || typeof resultData === 'string') {
            console.log('🔄 [RunningHub] Fetching detailed outputs...');
            const outputResp = await fetch('https://www.runninghub.ai/task/openapi/outputs', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Host': 'www.runninghub.ai' },
              body: JSON.stringify({ apiKey, taskId })
            });
            const outputResult = await outputResp.json();
            resultData = outputResult.data;
          }

          // Handle array of file objects (like in user's example)
          if (Array.isArray(resultData)) {
            console.log('📄 [RunningHub] Output is a file list. Searching for .txt file...');
            const txtFile = resultData.find(f => f.fileType === 'txt' || f.fileUrl?.endsWith('.txt'));

            if (txtFile && txtFile.fileUrl) {
              console.log('📥 [RunningHub] Fetching text content from:', txtFile.fileUrl);
              const textResp = await fetch(txtFile.fileUrl);
              resultText = await textResp.text();
              console.log('📝 [RunningHub] Content fetched successfully!');
            }
          } else if (typeof resultData === 'object' && resultData.taskResult) {
            resultText = resultData.taskResult;
          } else {
            resultText = JSON.stringify(resultData);
          }

          return resultText || 'Generation complete.';
        }

        // Check for failure (both string "FAILED" and numeric 3)
        if (status === 'FAILED' || status === 3) {
          console.log('❌ [RunningHub] Task Failed on RunningHub');
          throw new Error('Task failed on RunningHub');
        }
      } else {
        console.warn('⚠️ [RunningHub] Status API error:', statusResult.code, statusResult.msg);
      }

      attempts++;
    }
    console.error('⏰ [RunningHub] Task Timed Out locally');
    throw new Error('Task timed out');
  } catch (error) {
    console.error('❌ [RunningHub] OpenAPI Error:', error);
    throw error;
  }
});


// IPC Handler: RunningHub Watermark Removal
ipcMain.handle('runninghub:removeWatermark', async (event, data) => {
  console.log('========== WATERMARK REMOVAL START ==========');
  console.log('📦 [Watermark] Raw data received:', JSON.stringify({
    hasApiKey: !!data?.apiKey,
    apiKeyLength: data?.apiKey?.length,
    workflowId: data?.workflowId,
    fileName: data?.fileName,
    imageDataLength: data?.imageBase64?.length
  }));

  const { apiKey, workflowId, imageBase64, fileName } = data || {};

  console.log('🖼️ [Watermark] Starting watermark removal for:', fileName);
  console.log('🔧 [Watermark] Using workflow ID:', workflowId);
  console.log('🔑 [Watermark] API Key provided:', apiKey ? 'Yes (length: ' + apiKey.length + ')' : 'NO!');

  // Validate inputs
  if (!apiKey) {
    return { success: false, error: 'API Key is required. Please set it in Settings.' };
  }
  if (!workflowId) {
    return { success: false, error: 'Workflow ID is required. Please set it in Settings.' };
  }

  try {
    // 1. Upload image to RunningHub using multipart/form-data
    console.log('📤 [Watermark] Uploading image...');
    console.log('📊 [Watermark] Image data length:', imageBase64?.length || 0);

    // Trim and clean the API key
    const cleanApiKey = apiKey.trim();
    console.log('🔐 [Watermark] API Key (first 4 chars):', cleanApiKey.substring(0, 4) + '...');
    console.log('🔐 [Watermark] API Key (last 4 chars):', '...' + cleanApiKey.substring(cleanApiKey.length - 4));

    // Convert base64 to Buffer
    const imageBuffer = Buffer.from(imageBase64, 'base64');
    console.log('📊 [Watermark] Image buffer size:', imageBuffer.length, 'bytes');

    // Create multipart form data manually
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);

    // Build the multipart body
    let body = '';

    // Add apiKey field
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="apiKey"\r\n\r\n`;
    body += `${cleanApiKey}\r\n`;

    // Add fileType field
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="fileType"\r\n\r\n`;
    body += `input\r\n`;

    // Add file field
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n`;
    body += `Content-Type: image/png\r\n\r\n`;

    // Convert string parts to buffer and concatenate with image
    const bodyStart = Buffer.from(body, 'utf8');
    const bodyEnd = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8');
    const fullBody = Buffer.concat([bodyStart, imageBuffer, bodyEnd]);

    console.log('📝 [Watermark] Sending multipart form-data, total size:', fullBody.length, 'bytes');

    const uploadResponse = await fetch('https://www.runninghub.ai/task/openapi/upload', {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Host': 'www.runninghub.ai'
      },
      body: fullBody
    });

    const uploadResult = await uploadResponse.json();
    console.log('📦 [Watermark] Upload Response:', JSON.stringify(uploadResult));

    if (uploadResult.code !== 0) {
      throw new Error(uploadResult.msg || 'Failed to upload image');
    }

    const uploadedFileName = uploadResult.data.fileName;
    console.log('✅ [Watermark] Image uploaded as:', uploadedFileName);

    // 2. Create task with the uploaded image
    const runResponse = await fetch('https://www.runninghub.ai/task/openapi/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Host': 'www.runninghub.ai'
      },
      body: JSON.stringify({
        apiKey: apiKey,
        workflowId: workflowId,
        nodeInfoList: [
          {
            nodeId: "17",
            fieldName: "image",
            fieldValue: uploadedFileName
          }
        ]
      })
    });

    const runResult = await runResponse.json();
    console.log('📦 [Watermark] Create Task Response:', JSON.stringify(runResult));

    if (runResult.code !== 0) {
      throw new Error(runResult.msg || 'Failed to create watermark removal task');
    }

    const taskId = runResult.data.taskId;
    console.log('🆔 [Watermark] Task ID:', taskId);

    // 3. Poll for completion
    let attempts = 0;
    while (attempts < 60) {
      await new Promise(resolve => setTimeout(resolve, 3000));

      console.log(`🔍 [Watermark] Polling Status (Attempt ${attempts + 1})...`);
      const statusResponse = await fetch('https://www.runninghub.ai/task/openapi/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Host': 'www.runninghub.ai'
        },
        body: JSON.stringify({
          apiKey: apiKey,
          taskId: taskId
        })
      });

      const statusResult = await statusResponse.json();
      console.log(`📊 [Watermark] Status Response:`, JSON.stringify(statusResult));

      if (statusResult.code === 0) {
        const data = statusResult.data;

        // Handle both string and numeric status
        let status;
        if (typeof data === 'string') {
          status = data;
        } else if (typeof data === 'object' && data.status !== undefined) {
          status = data.status;
        }

        console.log(`✨ [Watermark] Current Status: ${status}`);

        if (status === 'SUCCESS' || status === 2) {
          console.log('✅ [Watermark] Task Successful! Fetching output...');

          // Fetch outputs to get the processed image URL
          const outputResp = await fetch('https://www.runninghub.ai/task/openapi/outputs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Host': 'www.runninghub.ai' },
            body: JSON.stringify({ apiKey, taskId })
          });
          const outputResult = await outputResp.json();
          console.log('📦 [Watermark] Outputs:', JSON.stringify(outputResult));

          if (outputResult.code === 0 && Array.isArray(outputResult.data)) {
            // Find the image file (node 7 is the SaveImage node)
            const imageFile = outputResult.data.find(f =>
              f.fileType === 'png' || f.fileType === 'jpg' || f.fileType === 'jpeg' || f.fileType === 'webp'
            );

            if (imageFile && imageFile.fileUrl) {
              console.log('🖼️ [Watermark] Processed image URL:', imageFile.fileUrl);
              return { success: true, imageUrl: imageFile.fileUrl };
            }
          }

          throw new Error('No output image found');
        }

        if (status === 'FAILED' || status === 3) {
          throw new Error('Watermark removal task failed');
        }
      }

      attempts++;
    }

    throw new Error('Watermark removal timed out');
  } catch (error) {
    console.error('❌ [Watermark] Error:', error);
    return { success: false, error: error.message };
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
