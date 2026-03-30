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
    // 3. 觸控螢幕支援 (Mobile/Tablet) - ⭐ 防多指干擾與粗手指優化版 ⭐
    // ==========================================
    let activeTouchItem = null;
    let activeTouchId = null; // ⭐ 新增：用來記住「主人」手指的專屬 ID

    dragItems.forEach(item => {
        item.addEventListener('touchstart', e => {
            // ⭐ 防護 1：如果已經有配件被拿著了，就嚴格禁止其他手指再來搗亂
            if (activeTouchItem) return; 

            e.preventDefault(); 
            
            // ⭐ 防護 2：認主儀式，記住第一根觸碰螢幕的手指 ID
            const touch = e.changedTouches[0];
            activeTouchId = touch.identifier; 

            activeTouchItem = e.currentTarget.closest('.drag-item');
            activeTouchItem.classList.add('touch-dragging');
            activeTouchItem.classList.remove('dropped');
            document.body.appendChild(activeTouchItem); 
            
            // 觸發第一下的位置更新
            updateTouchPosition(touch);
        }, { passive: false });

        item.addEventListener('touchmove', e => {
            if (!activeTouchItem) return;
            e.preventDefault();

            // ⭐ 防護 3：在茫茫手指中，只找我們記住的那根「主人手指」
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === activeTouchId) {
                    updateTouchPosition(e.changedTouches[i]);
                    break; // 找到了就停止尋找
                }
            }
        }, { passive: false });

        item.addEventListener('touchend', e => {
            if (!activeTouchItem) return;
            
            // ⭐ 防護 4：確認現在離開螢幕的，是不是我們的「主人手指」
            let isPrimaryTouchEnded = false;
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === activeTouchId) {
                    isPrimaryTouchEnded = true;
                    break;
                }
            }
            
            // 如果離開的只是旁邊搗亂的手指，就不理它，繼續保持拖曳狀態
            if (!isPrimaryTouchEnded) return; 

            // 🎯 以下為原本的穿透判定與放置邏輯
            const rect = activeTouchItem.getBoundingClientRect();
            const itemCenterX = rect.left + rect.width / 2;
            const itemCenterY = rect.top + rect.height / 2;

            activeTouchItem.classList.remove('touch-dragging');
            
            const itemCategory = activeTouchItem.getAttribute('data-category');
            let placedSuccessfully = false;

            const targetZones = document.querySelectorAll(`.drop-zone[data-accept="${itemCategory}"]`);

            targetZones.forEach(zone => {
                const zoneRect = zone.getBoundingClientRect();
                
                if (
                    itemCenterX >= zoneRect.left &&
                    itemCenterX <= zoneRect.right &&
                    itemCenterY >= zoneRect.top &&
                    itemCenterY <= zoneRect.bottom
                ) {
                    if (zone.hasChildNodes()) {
                        const existingItem = zone.querySelector('.drag-item');
                        if (existingItem) returnToInventory(existingItem);
                    }
                    zone.appendChild(activeTouchItem);
                    resetItemStyles(activeTouchItem);
                    activeTouchItem.classList.add('dropped');
                    placedSuccessfully = true;
                }
            });

            // 如果沒放準，退回衣櫃
            if (!placedSuccessfully) {
                resetItemStyles(activeTouchItem);
                returnToInventory(activeTouchItem);
            }
            
            // ⭐ 防護 5：配件放好後，清空記憶，準備迎接下一次全新的點擊
            activeTouchItem = null;
            activeTouchId = null; 
        });
    });

    function updateTouchPosition(touch) {
        if (!activeTouchItem) return;
        const rect = activeTouchItem.getBoundingClientRect();
        
        // 視覺偏移 (Offset)：保持懸浮在手指上方 60px
        activeTouchItem.style.left = touch.clientX - (rect.width / 2) + 'px';
        activeTouchItem.style.top = touch.clientY - (rect.height / 2) - 60 + 'px'; 
    }

    function resetItemStyles(item) {
        item.style.position = '';
        item.style.left = '';
        item.style.top = '';
    }
    // ==========================================
    // 4. 下載作品截圖功能 (加入手機版「半身照防裁切」機制)
    // ==========================================
    const downloadBtn = document.getElementById('download-btn');
    const stageToCapture = document.getElementById('stage');

    if (downloadBtn && stageToCapture) {
        downloadBtn.addEventListener('click', () => {
            const originalText = downloadBtn.innerText;
            downloadBtn.innerText = '⏳ 圖片生成中...';
            downloadBtn.style.pointerEvents = 'none'; 

            const offsetAmount = 0; // 服裝補償位移

            // 1. 強制捲軸回到最上方
            window.scrollTo(0, 0);

            // 2. 凍結內部排版
            const silContainer = document.querySelector('.silhouettes-container');
            let originalSilContainerStyle = '';
            if (silContainer) {
                originalSilContainerStyle = silContainer.getAttribute('style') || '';
                const silContainerRect = silContainer.getBoundingClientRect();
                silContainer.style.height = silContainerRect.height + 'px'; 
                silContainer.style.flex = 'none'; 
            }

            // ⭐ 3. 手機版防裁切：抓取「真實內容高度 (scrollHeight)」，無視手機螢幕壓縮 ⭐
            const actualWidth = Math.max(stageToCapture.clientWidth, stageToCapture.scrollWidth);
            // 人物是 500px 高，加上 padding 大約需要 550px。取 scrollHeight 跟 550 中比較大的一個
            const actualHeight = Math.max(stageToCapture.scrollHeight, 550); 
            
            stageToCapture.style.width = actualWidth + 'px';
            stageToCapture.style.height = (actualHeight + offsetAmount) + 'px'; 
            
            // 強制解除隱藏限制，確保腳能露出來
            const originalOverflow = stageToCapture.style.overflow || '';
            stageToCapture.style.overflow = 'visible';

            // ⭐ 4. 強制鎖死人物身高：無視手機擠壓，死釘在 250x500 ⭐
            const silhouettes = document.querySelectorAll('.silhouette');
            silhouettes.forEach(s => {
                s.style.width = '250px';   
                s.style.height = '500px';  
            });

            // 5. 雙人同步往下推
            const bodyZones = document.querySelectorAll('.zone-body');
            const originalBodyTops = [];
            bodyZones.forEach((zone, index) => {
                originalBodyTops[index] = zone.style.top;
                const currentTop = parseFloat(window.getComputedStyle(zone).top) || 87;
                zone.style.top = (currentTop + offsetAmount) + 'px'; 
            });

            // 隱藏虛線框
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
                scrollX: 0,
                // ⭐ 6. 截圖核心：強制指定畫布尺寸，拒絕套件自動裁切 ⭐
                width: actualWidth,
                height: actualHeight + offsetAmount
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
                stageToCapture.style.overflow = originalOverflow; // 恢復 overflow
                
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
