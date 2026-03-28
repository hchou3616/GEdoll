document.addEventListener('DOMContentLoaded', () => {
    const dragItems = document.querySelectorAll('.drag-item');
    const dropZones = document.querySelectorAll('.drop-zone');
    const inventory = document.getElementById('inventory');
    const resetBtn = document.getElementById('reset-btn');

    // ==========================================
    // 0. 網頁載入初始化：紀錄衣櫃配件的原始順序
    // ==========================================
    Array.from(inventory.children).forEach((child, index) => {
        child.setAttribute('data-original-order', index);
    });

    // 輔助函數：將配件放回衣櫃，並依照原始號碼重新排隊
    function returnToInventory(item) {
        inventory.appendChild(item);
        const sortedChildren = Array.from(inventory.children).sort((a, b) => {
            return parseInt(a.getAttribute('data-original-order')) - parseInt(b.getAttribute('data-original-order'));
        });
        sortedChildren.forEach(child => inventory.appendChild(child));
    }

    // ==========================================
    // 1. 重置按鈕邏輯
    // ==========================================
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            const stagedItems = document.querySelectorAll('.drop-zone .drag-item');
            stagedItems.forEach(item => {
                item.classList.remove('dropped');
                resetItemStyles(item);
                returnToInventory(item); 
            });
        });
    }

    // ==========================================
    // 2. 滑鼠拖曳邏輯 (Desktop)
    // ==========================================
    dragItems.forEach(item => {
        item.addEventListener('dragstart', e => {
            const dragContainer = e.target.closest('.drag-item');
            e.dataTransfer.setData('text/plain', dragContainer.id);
            setTimeout(() => {
                dragContainer.classList.add('dragging');
                dragContainer.classList.remove('dropped');
            }, 0);
        });
        item.addEventListener('dragend', e => {
            e.target.closest('.drag-item').classList.remove('dragging');
        });
    });

    dropZones.forEach(zone => {
        zone.addEventListener('dragover', e => e.preventDefault());
        zone.addEventListener('dragenter', function(e) { 
            e.preventDefault(); 
            this.classList.add('drag-over'); 
        });
        zone.addEventListener('dragleave', function() { 
            this.classList.remove('drag-over'); 
        });
        zone.addEventListener('drop', function(e) {
            this.classList.remove('drag-over');
            const itemId = e.dataTransfer.getData('text/plain');
            if(!itemId) return; 
            const item = document.getElementById(itemId);
            
            if (this.getAttribute('data-accept') === item.getAttribute('data-category')) {
                if (this.hasChildNodes()) {
                    const existingItem = this.querySelector('.drag-item');
                    if (existingItem) returnToInventory(existingItem);
                }
                this.appendChild(item);
                item.classList.add('dropped');
            }
        });
    });

    if (inventory) {
        inventory.addEventListener('dragover', e => e.preventDefault());
        inventory.addEventListener('drop', e => {
            const itemId = e.dataTransfer.getData('text/plain');
            if(!itemId) return;
            const item = document.getElementById(itemId);
            item.classList.remove('dropped');
            returnToInventory(item); 
        });
    }

    // ==========================================
    // 3. 觸控螢幕支援 (Mobile/Tablet)
    // ==========================================
    let activeTouchItem = null;

    dragItems.forEach(item => {
        item.addEventListener('touchstart', e => {
            e.preventDefault(); 
            activeTouchItem = e.currentTarget.closest('.drag-item');
            activeTouchItem.classList.add('touch-dragging');
            activeTouchItem.classList.remove('dropped');
            document.body.appendChild(activeTouchItem); 
            updateTouchPosition(e.touches[0]);
        }, { passive: false });

        item.addEventListener('touchmove', e => {
            if (!activeTouchItem) return;
            e.preventDefault();
            updateTouchPosition(e.touches[0]);
        }, { passive: false });

        item.addEventListener('touchend', e => {
            if (!activeTouchItem) return;
            const touch = e.changedTouches[0];
            activeTouchItem.classList.remove('touch-dragging');
            
            const dropTarget = document.elementFromPoint(touch.clientX, touch.clientY);
            let placedSuccessfully = false;

            if (dropTarget && dropTarget.classList.contains('drop-zone')) {
                if (dropTarget.getAttribute('data-accept') === activeTouchItem.getAttribute('data-category')) {
                    if (dropTarget.hasChildNodes()) {
                        const existingItem = dropTarget.querySelector('.drag-item');
                        if (existingItem) returnToInventory(existingItem);
                    }
                    dropTarget.appendChild(activeTouchItem);
                    resetItemStyles(activeTouchItem);
                    activeTouchItem.classList.add('dropped');
                    placedSuccessfully = true;
                }
            }
            if (!placedSuccessfully) {
                resetItemStyles(activeTouchItem);
                returnToInventory(activeTouchItem);
            }
            activeTouchItem = null;
        });
    });

    function updateTouchPosition(touch) {
        if (!activeTouchItem) return;
        const rect = activeTouchItem.getBoundingClientRect();
        activeTouchItem.style.left = touch.clientX - (rect.width / 2) + 'px';
        activeTouchItem.style.top = touch.clientY - (rect.height / 2) + 'px';
    }

    function resetItemStyles(item) {
        item.style.position = '';
        item.style.left = '';
        item.style.top = '';
    }

    // ==========================================
    // 4. 下載作品截圖功能 (加入雙人補償位移 + 自動長高防切邊)
    // ==========================================
    const downloadBtn = document.getElementById('download-btn');
    const stageToCapture = document.getElementById('stage');

    if (downloadBtn && stageToCapture) {
        downloadBtn.addEventListener('click', () => {
            const originalText = downloadBtn.innerText;
            downloadBtn.innerText = '⏳ 圖片生成中...';
            downloadBtn.style.pointerEvents = 'none'; 

            // ⭐ 1. 設定補償位移參數 (您可以隨時微調這個數字) ⭐
            const offsetAmount = 10; // 服裝往下推多少，白板下緣就跟著增加多少

            // 強制捲軸回到最上方
            window.scrollTo(0, 0);

            // ⭐ 2. 凍結內部排版：避免大白板長高時，裡面的人物跟著位移 ⭐
            const silContainer = document.querySelector('.silhouettes-container');
            let originalSilContainerStyle = '';
            if (silContainer) {
                originalSilContainerStyle = silContainer.getAttribute('style') || '';
                const silContainerRect = silContainer.getBoundingClientRect();
                silContainer.style.height = silContainerRect.height + 'px'; // 鎖死高度
                silContainer.style.flex = 'none'; // 拔除 Flex，死釘在原位
            }

            // ⭐ 3. 大白板自動長高：高度加上剛剛設定的 offsetAmount ⭐
            const rect = stageToCapture.getBoundingClientRect();
            stageToCapture.style.width = rect.width + 'px';
            stageToCapture.style.height = (rect.height + offsetAmount) + 'px'; 

            // 鎖定每一個人物外框的尺寸
            const silhouettes = document.querySelectorAll('.silhouette');
            silhouettes.forEach(s => {
                const sRect = s.getBoundingClientRect();
                s.style.width = sRect.width + 'px';
                s.style.height = sRect.height + 'px';
            });

            // ⭐ 4. 雙人同步往下推：推動的距離剛好等於大白板長高的距離 ⭐
            const bodyZones = document.querySelectorAll('.zone-body');
            const originalBodyTops = [];
            bodyZones.forEach((zone, index) => {
                originalBodyTops[index] = zone.style.top;
                const currentTop = parseFloat(window.getComputedStyle(zone).top) || 87;
                zone.style.top = (currentTop + offsetAmount) + 'px'; 
            });

            // 隱藏虛線框 (變透明)
            const allDropZones = document.querySelectorAll('.drop-zone');
            allDropZones.forEach(zone => {
                zone.style.borderColor = 'transparent';
            });

            // 開始截圖
            html2canvas(stageToCapture, {
                backgroundColor: '#ffffff', 
                scale: 2, 
                useCORS: true,
                scrollY: 0, 
                scrollX: 0  
            }).then(canvas => {
                const imageURL = canvas.toDataURL('image/png');
                const downloadLink = document.createElement('a');
                downloadLink.href = imageURL;
                downloadLink.download = 'My_DressUp_Work.png'; 
                
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);

                // 恢復虛線框
                allDropZones.forEach(zone => {
                    zone.style.borderColor = '';
                });

                // 解除大白板與人物外框的鎖定
                stageToCapture.style.width = '';
                stageToCapture.style.height = '';
                silhouettes.forEach(s => {
                    s.style.width = '';
                    s.style.height = '';
                });

                // 恢復內部排版
                if (silContainer) {
                    silContainer.setAttribute('style', originalSilContainerStyle);
                }

                // 恢復身體區塊原本的位置
                bodyZones.forEach((zone, index) => {
                    zone.style.top = originalBodyTops[index];
                });

                downloadBtn.innerText = originalText;
                downloadBtn.style.pointerEvents = 'auto';
            }).catch(err => {
                console.error('匯出圖片失敗:', err);
                alert('抱歉，匯出圖片時發生錯誤，請稍後再試。');
                downloadBtn.innerText = originalText;
                downloadBtn.style.pointerEvents = 'auto';
            });
        });
    }
});