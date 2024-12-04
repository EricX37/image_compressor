document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const qualityOptions = document.getElementsByName('quality');
    const controls = document.querySelector('.controls');
    const previewContainer = document.querySelector('.preview-container');
    const originalPreview = document.getElementById('originalPreview');
    const compressedPreview = document.getElementById('compressedPreview');
    const originalInfo = document.getElementById('originalInfo');
    const compressedInfo = document.getElementById('compressedInfo');
    const downloadBtn = document.getElementById('downloadBtn');

    // 拖拽上传处理
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#0071e3';
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#ccc';
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#ccc';
        const files = e.dataTransfer.files;
        handleFiles(files);
    });

    // 点击上传处理
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });

    // 质量调节处理
    qualityOptions.forEach(option => {
        option.addEventListener('change', () => {
            if (originalPreview.src) {
                compressImage(originalPreview);
            }
        });
    });

    // 文件处理函数
    let currentFile = null;  // 添加全局变量存储当前文件

    // 修改格式化文件大小的辅助函数
    function formatFileSize(bytes) {
        const kb = bytes / 1024;
        if (kb >= 1024) {
            const mb = kb / 1024;
            // 使用 toFixed(2) 确保只保留2位小数
            // 使用 parseFloat 去除末尾的0
            return `${parseFloat(mb.toFixed(2))} MB`;
        }
        return `${parseFloat(kb.toFixed(2))} KB`;
    }

    function handleFiles(files) {
        if (files.length === 0) return;
        
        const file = files[0];
        currentFile = file;  // 保存文件引用
        
        if (!file.type.startsWith('image/')) {
            alert('请上传图片文件！');
            return;
        }

        controls.hidden = false;
        previewContainer.hidden = false;

        // 添加格式信息
        const format = file.type.split('/')[1].toUpperCase();
        originalInfo.textContent = `大小: ${formatFileSize(file.size)} | 格式: ${format}`;

        const reader = new FileReader();
        reader.onload = (e) => {
            originalPreview.src = e.target.result;
            originalPreview.onload = () => {
                compressImage(originalPreview);
            };
        };
        reader.readAsDataURL(file);
    }

    // 图片压缩函数
    function compressImage(img) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        ctx.drawImage(img, 0, 0);

        const originalSize = currentFile.size / 1024;
        const originalFormat = currentFile.type;

        // 修改压缩策略函数
        function getCompressionStrategy() {
            const strategies = {
                'image/jpeg': {
                    quality: {
                        high: 0.95,    // 低压缩 - 几乎无损
                        medium: 0.85,  // 中压缩 - 轻微可见损失
                        low: 0.65      // 强压缩 - 明显质量损失
                    }
                },
                'image/png': {
                    quality: {
                        high: 0.95,
                        medium: 0.85,
                        low: 0.75
                    }
                },
                'image/webp': {
                    quality: {
                        high: 0.95,
                        medium: 0.85,
                        low: 0.65
                    }
                }
            };

            const strategy = strategies[originalFormat] || strategies['image/jpeg'];
            const selectedQuality = Array.from(qualityOptions).find(opt => opt.checked).value;
            
            // 始终返回原始格式
            return {
                format: originalFormat,
                quality: strategy.quality[selectedQuality]
            };
        }

        const strategy = getCompressionStrategy();
        
        // 修改压缩处理逻辑
        canvas.toBlob((blob) => {
            if (blob.size / 1024 > originalSize) {
                // 如果压缩后还是太大，尝试使用更低的质量但保持原格式
                const lowerQuality = Math.max(0.5, strategy.quality * 0.7);  // 降低30%质量，但不低于0.5
                canvas.toBlob((retryBlob) => {
                    const finalBlob = retryBlob.size < blob.size ? retryBlob : blob;
                    if (finalBlob.size / 1024 > originalSize) {
                        // 如果还是太大，使用原图
                        const blobUrl = URL.createObjectURL(currentFile);
                        updatePreviewAndDownload(currentFile, blobUrl, currentFile.size);
                    } else {
                        const blobUrl = URL.createObjectURL(finalBlob);
                        updatePreviewAndDownload(finalBlob, blobUrl, finalBlob.size);
                    }
                }, strategy.format, lowerQuality);
            } else {
                const blobUrl = URL.createObjectURL(blob);
                updatePreviewAndDownload(blob, blobUrl, blob.size);
            }
        }, strategy.format, strategy.quality);
    }

    // 新增：更新预览和下载按钮的辅助函数
    function updatePreviewAndDownload(blob, blobUrl, size) {
        // 释放之前的 URL
        if (compressedPreview.src.startsWith('blob:')) {
            URL.revokeObjectURL(compressedPreview.src);
        }

        // 更新预览
        compressedPreview.src = blobUrl;
        // 添加格式信息
        const format = blob.type.split('/')[1].toUpperCase();
        compressedInfo.textContent = `大小: ${formatFileSize(size)} | 格式: ${format}`;
        
        // 更新下载按钮
        downloadBtn.onclick = () => {
            const extension = blob.type.split('/')[1];
            const link = document.createElement('a');
            link.download = `compressed-image.${extension}`;
            link.href = blobUrl;
            link.click();
        };
    }
}); 