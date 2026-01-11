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

// IPC Handler: runninghub:uploadImage
ipcMain.handle('runninghub:uploadImage', async (event, { apiKey, imageBase64, fileName }) => {
  console.log('📤 [RunningHub] Uploading image:', fileName);
  if (!apiKey) throw new Error('API Key is required');

  try {
    const cleanApiKey = apiKey.trim();
    const imageBuffer = Buffer.from(imageBase64.split(',')[1] || imageBase64, 'base64');
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);

    let body = `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="apiKey"\r\n\r\n${cleanApiKey}\r\n`;
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="fileType"\r\n\r\ninput\r\n`;
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n`;
    body += `Content-Type: image/png\r\n\r\n`;

    const bodyStart = Buffer.from(body, 'utf8');
    const bodyEnd = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8');
    const fullBody = Buffer.concat([bodyStart, imageBuffer, bodyEnd]);

    const uploadResponse = await fetch('https://www.runninghub.ai/task/openapi/upload', {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Host': 'www.runninghub.ai'
      },
      body: fullBody
    });

    const uploadResult = await uploadResponse.json();
    console.log('📦 [RunningHub] Upload response:', uploadResult);

    if (uploadResult.code !== 0) {
      throw new Error(uploadResult.msg || 'Failed to upload image');
    }

    console.log('✅ [RunningHub] Upload success, fileName:', uploadResult.data.fileName);
    return { success: true, fileName: uploadResult.data.fileName };
  } catch (error) {
    console.error('❌ [RunningHub] Upload Error:', error);
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
    event.sender.send('runninghub:task-id', taskId);

    // 2. Poll for completion
    let errorCount = 0;
    while (true) {
      await new Promise(resolve => setTimeout(resolve, 3000)); // Every 3 seconds

      console.log(`🔍 [RunningHub] Polling Status for ${taskId}...`);
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
        let status;
        if (typeof data === 'string') {
          status = data;
        } else if (typeof data === 'object' && data.status !== undefined) {
          status = data.status;
        }

        console.log(`✨ [RunningHub] Current Status: ${status}`);

        if (status === 'SUCCESS' || status === 2) {
          console.log('✅ [RunningHub] Task Successful! Extracting results...');
          let resultData = (typeof data === 'object' ? (data.taskResult || data) : null);

          if (!resultData || typeof resultData === 'string' || !resultData.taskResult) {
            console.log('🔄 [RunningHub] Fetching detailed outputs...');
            const outputResp = await fetch('https://www.runninghub.ai/task/openapi/outputs', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Host': 'www.runninghub.ai' },
              body: JSON.stringify({ apiKey, taskId })
            });
            const outputResult = await outputResp.json();
            resultData = outputResult.data;
          }

          if (Array.isArray(resultData)) {
            const videoFile = resultData.find(f =>
              ['mp4', 'mov', 'webm'].includes(f.fileType?.toLowerCase()) ||
              /\.(mp4|mov|webm)$/i.test(f.fileUrl)
            );
            if (videoFile && videoFile.fileUrl) return videoFile.fileUrl;

            const txtFile = resultData.find(f => f.fileType === 'txt' || f.fileUrl?.endsWith('.txt'));
            if (txtFile && txtFile.fileUrl) {
              const textResp = await fetch(txtFile.fileUrl);
              return await textResp.text();
            }

            const firstFile = resultData.find(f => f.fileUrl);
            if (firstFile) return firstFile.fileUrl;
          }

          if (typeof resultData === 'string' && resultData.startsWith('http')) return resultData;
          if (typeof resultData === 'object' && resultData?.taskResult) return resultData.taskResult;
          return typeof resultData === 'string' ? resultData : JSON.stringify(resultData);
        }

        if (status === 'FAILED' || status === 3) {
          throw new Error('Task failed on RunningHub');
        }
      } else {
        console.warn('⚠️ [RunningHub] Status API error:', statusResult.code, statusResult.msg);
        if (statusResult.code === 807) return 'Task cancelled.';

        // Stop if we hit too many API errors in a row
        errorCount++;
        if (errorCount > 10) throw new Error(`API Connection lost: ${statusResult.msg}`);
      }

    }
  } catch (error) {
    console.error('❌ [RunningHub] OpenAPI Error:', error);
    throw error;
  }
});


// IPC Handler: runninghub:cancel
ipcMain.handle('runninghub:cancel', async (event, { apiKey, taskId }) => {
  console.log('🛑 [RunningHub] Cancelling task:', taskId);
  try {
    const response = await fetch('https://www.runninghub.ai/task/openapi/cancel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Host': 'www.runninghub.ai'
      },
      body: JSON.stringify({ apiKey, taskId })
    });
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('❌ [RunningHub] Cancel Error:', error);
    return { code: -1, msg: error.message };
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

// IPC Handler: Select Folder for Export
ipcMain.handle('dialog:selectFolder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory', 'createDirectory'],
    title: 'Select folder to save media'
  });
  if (result.canceled) return null;
  return result.filePaths[0];
});

// IPC Handler: Save File (supports base64 data URLs)
ipcMain.handle('file:save', async (event, folderPath, fileName, dataUrl) => {
  try {
    const filePath = path.join(folderPath, fileName);

    // Handle data URLs (base64)
    if (dataUrl.startsWith('data:')) {
      const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        const buffer = Buffer.from(matches[2], 'base64');
        fs.writeFileSync(filePath, buffer);
        return true;
      }
    }

    // Handle regular URLs - download them
    if (dataUrl.startsWith('http')) {
      const response = await fetch(dataUrl);
      const buffer = Buffer.from(await response.arrayBuffer());
      fs.writeFileSync(filePath, buffer);
      return true;
    }

    // Handle raw base64 (without data: prefix)
    const buffer = Buffer.from(dataUrl, 'base64');
    fs.writeFileSync(filePath, buffer);
    return true;
  } catch (error) {
    console.error('Error saving file:', error);
    return false;
  }
});

// IPC Handler: Generate rclone drive link
ipcMain.handle('rclone:generateLink', async (event, remotePath) => {
  try {
    const rclonePath = 'Z:\\Model pack\\EtsyAutomationApp\\rclone\\rclone.exe';
    const { execSync } = require('child_process');

    console.log('🔗 [Rclone] Generating link for:', remotePath);

    // Execute rclone link command
    const result = execSync(`"${rclonePath}" link "${remotePath}"`, {
      encoding: 'utf8',
      timeout: 30000
    }).trim();

    console.log('✅ [Rclone] Generated link:', result);
    return { success: true, link: result };
  } catch (error) {
    console.error('❌ [Rclone] Error:', error.message);
    return { success: false, error: error.message };
  }
});

// IPC Handler: Copy folder to Google Drive using rclone
ipcMain.handle('rclone:copyToDrive', async (event, localPath, remotePath) => {
  try {
    const rclonePath = 'Z:\\Model pack\\EtsyAutomationApp\\rclone\\rclone.exe';
    const { execSync } = require('child_process');

    console.log('📤 [Rclone] Copying to drive:', localPath, '->', remotePath);

    // Execute rclone copy command
    execSync(`"${rclonePath}" copy "${localPath}" "${remotePath}" --progress`, {
      encoding: 'utf8',
      timeout: 300000 // 5 min timeout
    });

    console.log('✅ [Rclone] Copy complete');
    return { success: true };
  } catch (error) {
    console.error('❌ [Rclone] Copy Error:', error.message);
    return { success: false, error: error.message };
  }
});

// IPC Handler: Generate Video using AI-App API
ipcMain.handle('runninghub:generateVideoAiApp', async (event, { apiKey, webappId, instanceType, nodeInfoList }) => {
  console.log('🎬 [AI-App Video] Starting generation...');
  console.log('🆔 webappId:', webappId);
  console.log('🔑 apiKey:', apiKey ? apiKey.substring(0, 8) + '...' : 'MISSING');
  console.log('📋 nodeInfoList:', nodeInfoList);

  try {
    // Try both domains - .ai first, then .cn
    const domains = ['www.runninghub.ai', 'www.runninghub.cn'];
    let runData = null;
    let workingDomain = null;

    for (const domain of domains) {
      console.log(`🌐 [AI-App Video] Trying domain: ${domain}`);

      const runResponse = await fetch(`https://${domain}/task/openapi/ai-app/run`, {
        method: 'POST',
        headers: {
          'Host': domain,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          webappId,
          apiKey,
          instanceType: instanceType || undefined,
          nodeInfoList
        })
      });

      runData = await runResponse.json();
      console.log(`🚀 [AI-App Video] Response from ${domain}:`, runData);

      if (runData.code === 0) {
        workingDomain = domain;
        break;
      } else if (runData.msg !== 'webapp not exists') {
        // Different error, don't try next domain
        throw new Error(runData.msg || 'Failed to start AI-App task');
      }
      console.log(`⚠️ [AI-App Video] webapp not exists on ${domain}, trying next...`);
    }

    if (!workingDomain || runData.code !== 0) {
      throw new Error(runData?.msg || 'webapp not exists on any domain');
    }

    const taskId = runData.data?.taskId;
    if (!taskId) {
      throw new Error('No taskId returned from AI-App');
    }

    console.log('✅ [AI-App Video] Task started:', taskId, 'on domain:', workingDomain);
    event.sender.send('runninghub:task-id', taskId);

    // Step 2: Poll for task completion using the working domain
    let attempts = 0;
    const maxAttempts = 300; // 5 minutes max

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const statusResponse = await fetch(`https://${workingDomain}/task/openapi/outputs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          taskId,
          apiKey
        })
      });

      const statusData = await statusResponse.json();

      if (statusData.code === 0 && statusData.data) {
        const outputs = statusData.data;

        // Check for video output
        for (const output of outputs) {
          if (output.fileType === 'video' || (output.fileUrl && output.fileUrl.includes('.mp4'))) {
            console.log('✨ [AI-App Video] Video generated:', output.fileUrl);
            return output.fileUrl;
          }
        }

        // Check if task failed
        if (outputs.some(o => o.status === 'FAILED')) {
          throw new Error('Video generation task failed');
        }

        // If we have outputs but no video yet, check if complete
        if (outputs.length > 0 && outputs.every(o => o.status === 'SUCCESS' || o.fileUrl)) {
          // All outputs ready, find video
          const videoOutput = outputs.find(o => o.fileUrl && (o.fileUrl.includes('.mp4') || o.fileUrl.includes('video')));
          if (videoOutput) {
            return videoOutput.fileUrl;
          }
        }
      }

      attempts++;

      if (attempts % 10 === 0) {
        console.log(`⏳ [AI-App Video] Still processing... (${attempts}s)`);
      }
    }

    throw new Error('Task timed out after 5 minutes');

  } catch (error) {
    console.error('❌ [AI-App Video] Error:', error.message);
    throw error;
  }
});

// IPC Handler: Open STL file dialog
ipcMain.handle('dialog:openStl', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'STL Files', extensions: ['stl'] }
    ],
    title: 'Select STL file to analyze'
  });
  if (result.canceled) return null;
  return result.filePaths[0];
});

// IPC Handler: Analyze STL file
ipcMain.handle('stl:analyze', async (event, filePath) => {
  console.log('📦 [STL] Analyzing file:', filePath);

  try {
    const stats = fs.statSync(filePath);
    const fileSize = stats.size;
    const buffer = fs.readFileSync(filePath);

    let triangleCount = 0;
    let volume = 0;
    let surfaceArea = 0;
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    // Helper function to calculate triangle area using cross product
    const triangleArea = (v1x, v1y, v1z, v2x, v2y, v2z, v3x, v3y, v3z) => {
      // Edge vectors
      const ax = v2x - v1x, ay = v2y - v1y, az = v2z - v1z;
      const bx = v3x - v1x, by = v3y - v1y, bz = v3z - v1z;
      // Cross product
      const cx = ay * bz - az * by;
      const cy = az * bx - ax * bz;
      const cz = ax * by - ay * bx;
      // Area = 0.5 * |cross product|
      return 0.5 * Math.sqrt(cx * cx + cy * cy + cz * cz);
    };

    // Check if ASCII or Binary STL
    const header = buffer.toString('ascii', 0, 80);
    const isAscii = header.toLowerCase().startsWith('solid') && buffer.toString('ascii', 0, 200).includes('facet');

    if (isAscii) {
      // Parse ASCII STL
      console.log('📄 [STL] Parsing as ASCII format...');
      const content = buffer.toString('ascii');
      const facetRegex = /facet\s+normal[\s\S]*?outer\s+loop[\s\S]*?vertex\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+([-\d.eE+]+)[\s\S]*?vertex\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+([-\d.eE+]+)[\s\S]*?vertex\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+([-\d.eE+]+)[\s\S]*?endloop[\s\S]*?endfacet/gi;

      let match;
      while ((match = facetRegex.exec(content)) !== null) {
        triangleCount++;

        // Parse vertices
        const v1 = { x: parseFloat(match[1]), y: parseFloat(match[2]), z: parseFloat(match[3]) };
        const v2 = { x: parseFloat(match[4]), y: parseFloat(match[5]), z: parseFloat(match[6]) };
        const v3 = { x: parseFloat(match[7]), y: parseFloat(match[8]), z: parseFloat(match[9]) };

        // Update bounds
        minX = Math.min(minX, v1.x, v2.x, v3.x);
        maxX = Math.max(maxX, v1.x, v2.x, v3.x);
        minY = Math.min(minY, v1.y, v2.y, v3.y);
        maxY = Math.max(maxY, v1.y, v2.y, v3.y);
        minZ = Math.min(minZ, v1.z, v2.z, v3.z);
        maxZ = Math.max(maxZ, v1.z, v2.z, v3.z);

        // Calculate signed volume of tetrahedron
        volume += (v1.x * (v2.y * v3.z - v3.y * v2.z) +
          v1.y * (v3.x * v2.z - v2.x * v3.z) +
          v1.z * (v2.x * v3.y - v3.x * v2.y)) / 6.0;

        // Calculate surface area
        surfaceArea += triangleArea(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z, v3.x, v3.y, v3.z);
      }
    } else {
      // Parse Binary STL
      console.log('📦 [STL] Parsing as Binary format...');

      if (buffer.length < 84) {
        throw new Error('Invalid STL file: too small');
      }

      triangleCount = buffer.readUInt32LE(80);
      console.log(`📊 [STL] Triangle count: ${triangleCount}`);

      let offset = 84;

      for (let i = 0; i < triangleCount && offset + 50 <= buffer.length; i++) {
        // Skip normal vector (12 bytes)
        offset += 12;

        // Read vertices
        const v1x = buffer.readFloatLE(offset);
        const v1y = buffer.readFloatLE(offset + 4);
        const v1z = buffer.readFloatLE(offset + 8);
        offset += 12;

        const v2x = buffer.readFloatLE(offset);
        const v2y = buffer.readFloatLE(offset + 4);
        const v2z = buffer.readFloatLE(offset + 8);
        offset += 12;

        const v3x = buffer.readFloatLE(offset);
        const v3y = buffer.readFloatLE(offset + 4);
        const v3z = buffer.readFloatLE(offset + 8);
        offset += 12;

        // Skip attribute (2 bytes)
        offset += 2;

        // Calculate bounding box on the fly
        if (v1x < minX) minX = v1x; if (v1x > maxX) maxX = v1x;
        if (v2x < minX) minX = v2x; if (v2x > maxX) maxX = v2x;
        if (v3x < minX) minX = v3x; if (v3x > maxX) maxX = v3x;

        if (v1y < minY) minY = v1y; if (v1y > maxY) maxY = v1y;
        if (v2y < minY) minY = v2y; if (v2y > maxY) maxY = v2y;
        if (v3y < minY) minY = v3y; if (v3y > maxY) maxY = v3y;

        if (v1z < minZ) minZ = v1z; if (v1z > maxZ) maxZ = v1z;
        if (v2z < minZ) minZ = v2z; if (v2z > maxZ) maxZ = v2z;
        if (v3z < minZ) minZ = v3z; if (v3z > maxZ) maxZ = v3z;

        // Calculate signed volume
        volume += (v1x * (v2y * v3z - v3y * v2z) +
          v1y * (v3x * v2z - v2x * v3z) +
          v1z * (v2x * v3y - v3x * v2y)) / 6.0;

        // Calculate surface area
        surfaceArea += triangleArea(v1x, v1y, v1z, v2x, v2y, v2z, v3x, v3y, v3z);
      }
    }

    // Handle case where no valid vertices were found
    if (minX === Infinity) {
      throw new Error('Could not parse STL file: no valid vertices found');
    }

    const dimensions = {
      x: maxX - minX,
      y: maxY - minY,
      z: maxZ - minZ
    };

    // Absolute volume in cubic millimeters
    volume = Math.abs(volume);

    console.log(`✅ [STL] Analysis complete:`, {
      dimensions,
      triangleCount,
      volume: volume.toFixed(2),
      surfaceArea: surfaceArea.toFixed(2),
      fileSize
    });

    return {
      success: true,
      dimensions,
      triangleCount,
      volume,
      surfaceArea,
      fileSize
    };
  } catch (error) {
    console.error('❌ [STL] Error analyzing file:', error);
    return {
      success: false,
      error: error.message,
      dimensions: { x: 0, y: 0, z: 0 },
      triangleCount: 0,
      volume: 0,
      surfaceArea: 0,
      fileSize: 0
    };
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
