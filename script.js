const imageUpload = document.getElementById('imageUpload');
const difficultySelect = document.getElementById('difficultySelect');
const startBtn = document.getElementById('startBtn');
const galleryImages = document.querySelectorAll('.gallery-img');
const timerDisplay = document.getElementById('timerDisplay');
const progressDisplay = document.getElementById('progressDisplay');

// 모달 관련 변수 선언
const modal = document.getElementById('imageModal');
const modalImage = document.getElementById('modalImage');
const modalSelectBtn = document.getElementById('modalSelectBtn');
const modalCloseBtn = document.getElementById('modalCloseBtn');
const modalStreamerLink = document.getElementById('modalStreamerLink');
let selectedTempImage = null;

// 저장 및 불러오기 관련 변수
const saveBtn = document.getElementById('saveBtn');
const loadBtn = document.getElementById('loadBtn');
let currentStage = null; 
let horizontalEdges = [];
let verticalEdges = [];

let uploadedImage = new Image();

let isGamePlaying = false; // 💡 게임 진행 상태를 체크하는 변수

const BOARD_WIDTH = 960;  
const BOARD_HEIGHT = 540;
const STAGE_WIDTH = 1840;
const STAGE_HEIGHT = 780;

let timerInterval = null;
let secondsElapsed = 0;
let solvedPieces = 0;
let maxPieces = 0;

// 첨부파일 업로드 시
imageUpload.addEventListener('change', (e) => {
    galleryImages.forEach(img => img.classList.remove('selected'));
    const reader = new FileReader();
    reader.onload = (event) => {
        uploadedImage.src = event.target.result;
        uploadedImage.onload = () => { startBtn.disabled = false; };
    };
    reader.readAsDataURL(e.target.files[0]);
});

// 👇 기존 갤러리 클릭 이벤트를 아래 코드로 완전히 교체하세요.
galleryImages.forEach(img => {
    img.addEventListener('click', (e) => {
        modal.style.display = 'flex';
        modalImage.src = e.target.src;
        selectedTempImage = e.target;
        
        // 💡 핵심 근거: 게임 중이면 [선택] 버튼을 숨겨서 덮어씌우기를 원천 차단
        if (isGamePlaying) {
            modalSelectBtn.style.display = 'none';
        } else {
            modalSelectBtn.style.display = 'inline-block';
        }
        
        if(e.target.dataset.url) {
            modalStreamerLink.href = e.target.dataset.url;
            modalStreamerLink.style.display = 'flex'; 
        } else {
            modalStreamerLink.style.display = 'none'; 
        }
    });
});

// 모달 닫기 버튼
modalCloseBtn.addEventListener('click', () => {
    modal.style.display = 'none';
    selectedTempImage = null;
});

// 모달 배경 클릭 시 닫기
window.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.style.display = 'none';
        selectedTempImage = null;
    }
});

// 모달 선택 버튼 (실제 이미지 적용)
modalSelectBtn.addEventListener('click', () => {
    if (selectedTempImage) {
        galleryImages.forEach(i => i.classList.remove('selected'));
        selectedTempImage.classList.add('selected');
        
        imageUpload.value = "";
        uploadedImage.crossOrigin = "Anonymous"; 
        uploadedImage.src = selectedTempImage.src;
        
        uploadedImage.onload = () => { startBtn.disabled = false; };
    }
    modal.style.display = 'none'; 
});

// 퍼즐 시작 버튼
startBtn.addEventListener('click', () => createFHDJigsawPuzzle(null));

function startTimer() {
    clearInterval(timerInterval);
    // 새로 시작이 아닌 불러오기일 경우, 기존 시간을 이어서 진행
    timerDisplay.innerText = `${String(Math.floor(secondsElapsed / 60)).padStart(2, '0')}:${String(secondsElapsed % 60).padStart(2, '0')}`;
    
    timerInterval = setInterval(() => {
        secondsElapsed++;
        const mins = String(Math.floor(secondsElapsed / 60)).padStart(2, '0');
        const secs = String(secondsElapsed % 60).padStart(2, '0');
        timerDisplay.innerText = `${mins}:${secs}`;
    }, 1000);
}

function createFHDJigsawPuzzle(saveData = null) {
    document.getElementById('puzzle-container').innerHTML = '';

    const totalPieces = saveData ? saveData.difficulty : parseInt(difficultySelect.value);
    maxPieces = totalPieces;
    solvedPieces = saveData ? saveData.solvedPieces : 0;
    secondsElapsed = saveData ? saveData.secondsElapsed : 0;
    
    startTimer();
    
// 👇 게임 시작 시 세팅 수정
    isGamePlaying = true; // 게임 상태 켜기
    imageUpload.disabled = true;
    difficultySelect.disabled = true;
    startBtn.disabled = true;
    if (saveBtn) saveBtn.disabled = false;

    // galleryImages.forEach(img => img.style.pointerEvents = 'none');
    
    const percent = Math.floor((solvedPieces / maxPieces) * 100);
    progressDisplay.innerText = `${solvedPieces} / ${maxPieces} (${percent}%)`;

    const COLUMNS = Math.sqrt(totalPieces);
    const ROWS = Math.sqrt(totalPieces);

    const stage = new Konva.Stage({
        container: 'puzzle-container',
        width: STAGE_WIDTH,
        height: STAGE_HEIGHT
    });
    
    currentStage = stage;
    
    const mainLayer = new Konva.Layer(); 
    const dragLayer = new Konva.Layer(); 
    stage.add(mainLayer);
    stage.add(dragLayer);

    stage.draggable(true);
    let isStageLocked = false; 

    const scaleBy = 1.25; 
    const MIN_SCALE = 1;
    const MAX_SCALE = 6;

    function zoomStage(zoomIn) {
        const oldScale = stage.scaleX();
        const center = { x: STAGE_WIDTH / 2, y: STAGE_HEIGHT / 2 };

        const mousePointTo = {
            x: (center.x - stage.x()) / oldScale,
            y: (center.y - stage.y()) / oldScale,
        };

        let newScale = zoomIn ? oldScale * scaleBy : oldScale / scaleBy;
        newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));

        stage.scale({ x: newScale, y: newScale });

        const newPos = {
            x: center.x - mousePointTo.x * newScale,
            y: center.y - mousePointTo.y * newScale,
        };

        if (newScale === 1) {
            stage.position({ x: 0, y: 0 });
        } else {
            stage.position(newPos);
        }
        
        stage.batchDraw();
    }

    window.removeEventListener('keydown', handleKeyDown);
    window.addEventListener('keydown', handleKeyDown);

    function handleKeyDown(e) {
        if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'SELECT') return;

        const key = e.key.toLowerCase();

        if (e.key === '+' || e.key === '=') { 
            e.preventDefault();
            zoomStage(true);
        } else if (e.key === '-') {
            e.preventDefault();
            zoomStage(false);
        } else if (e.key === 'Backspace' || e.key === 'Escape') { 
            e.preventDefault();
            stage.scale({ x: 1, y: 1 });
            stage.position({ x: 0, y: 0 });
            stage.batchDraw();
        } else if (key === 'l' || e.key === 'ㅣ' || e.code === 'KeyL') { 
            e.preventDefault();
            isStageLocked = !isStageLocked;
            stage.draggable(!isStageLocked); 
            updateHintLabel(); 
            mainLayer.batchDraw();
        }
    }

    const w = BOARD_WIDTH / COLUMNS;
    const h = BOARD_HEIGHT / ROWS;
    const boardX = (STAGE_WIDTH - BOARD_WIDTH) / 2; 
    const boardY = (STAGE_HEIGHT - BOARD_HEIGHT) / 2; 
    const framePadding = 12; 

    const outerFrame = new Konva.Rect({
        x: boardX - framePadding, y: boardY - framePadding,
        width: BOARD_WIDTH + (framePadding * 2), height: BOARD_HEIGHT + (framePadding * 2),
        fillLinearGradientStartPoint: { x: 0, y: 0 },
        fillLinearGradientEndPoint: { x: BOARD_WIDTH, y: BOARD_HEIGHT },
        fillLinearGradientColorStops: [0, '#2c1e15', 0.5, '#423024', 1, '#1a110b'], 
        stroke: '#5c4636', strokeWidth: 1.5,
        shadowColor: '#000000', shadowBlur: 20, shadowOffset: { x: 5, y: 8 }, shadowOpacity: 0.7,
        listening: false
    });
    mainLayer.add(outerFrame);

    const innerFrameLine = new Konva.Rect({
        x: boardX - 3, y: boardY - 3,
        width: BOARD_WIDTH + 6, height: BOARD_HEIGHT + 6,
        stroke: '#8a6d55', strokeWidth: 1.5,
        listening: false
    });
    mainLayer.add(innerFrameLine);

    const board = new Konva.Rect({
        x: boardX, y: boardY,
        width: BOARD_WIDTH, height: BOARD_HEIGHT,
        fill: '#0f0f0f', stroke: '#000000', strokeWidth: 2,
        listening: false
    });
    mainLayer.add(board);

    const fullPerfectImage = new Konva.Image({
        x: boardX, y: boardY,
        image: uploadedImage,
        width: BOARD_WIDTH, height: BOARD_HEIGHT,
        opacity: 0,
        listening: false
    });
    mainLayer.add(fullPerfectImage);

    const transparentGuideImage = new Konva.Image({
        x: boardX, y: boardY,
        image: uploadedImage,
        width: BOARD_WIDTH, height: BOARD_HEIGHT,
        opacity: 0.45, 
        visible: false,
        listening: false
    });
    mainLayer.add(transparentGuideImage);

    const hintX = STAGE_WIDTH - 240 - 40; 
    const hintY = 85; 
    
    const hintImage = new Konva.Image({
        x: hintX, y: hintY, image: uploadedImage,
        width: 240, height: 135,
        stroke: '#3498db', strokeWidth: 2,
        shadowColor: '#000', shadowBlur: 8, shadowOpacity: 0.5,
        cursor: 'pointer'
    });
    
    const hintLabel = new Konva.Text({
        x: hintX, y: hintY - 65, 
        fontSize: 12, fontStyle: 'bold', fill: '#3498db', lineHeight: 1.4
    });
    mainLayer.add(hintImage);
    mainLayer.add(hintLabel);

    function updateHintLabel() {
        const lockStatus = isStageLocked ? "🔒 화면 잠금" : "🔓 이동 가능";
        hintLabel.text(
            `💡 사진 클릭 시 메인에 힌트 온/오프\n` +
            `⌨️ [ + ] [ - ] 확대/축소  |  [Backspace] 크기 초기화\n` +
            `⌨️ [ L / ㅣ ] 화면 잠금 토글 상태: ${lockStatus}`
        );
    }
    updateHintLabel(); 

    hintImage.on('mouseenter', () => { stage.container().style.cursor = 'pointer'; });
    hintImage.on('mouseleave', () => { stage.container().style.cursor = 'default'; });
    
    hintImage.on('click', () => {
        const isVisible = transparentGuideImage.visible();
        transparentGuideImage.visible(!isVisible);
        if(!isVisible) {
            hintImage.stroke('#2ecc71'); 
            hintLabel.fill('#2ecc71');
        } else {
            hintImage.stroke('#3498db'); 
            hintLabel.fill('#3498db');
        }
        mainLayer.batchDraw();
    });

    const piecesGroup = new Konva.Group();
    mainLayer.add(piecesGroup);

    function checkGameProgress() {
        const percent = Math.floor((solvedPieces / maxPieces) * 100);
        progressDisplay.innerText = `${solvedPieces} / ${maxPieces} (${percent}%)`;
        
        if (solvedPieces === maxPieces) {
            clearInterval(timerInterval);
            transparentGuideImage.visible(false);

            // 👇 게임 종료 시 세팅 수정
            isGamePlaying = false; // 게임 상태 끄기
            imageUpload.disabled = false;
            difficultySelect.disabled = false;
            startBtn.disabled = false;
            if (saveBtn) saveBtn.disabled = true;

            // galleryImages.forEach(img => img.style.pointerEvents = 'auto');

            const fadeOutPieces = new Konva.Tween({
                node: piecesGroup,
                duration: 0.8,
                opacity: 0,
                easing: Konva.Easings.EaseInOut
            });

            const fadeInFullImage = new Konva.Tween({
                node: fullPerfectImage,
                duration: 0.8,
                opacity: 1,
                easing: Konva.Easings.EaseInOut,
                onFinish: () => {
                    setTimeout(() => {
                        alert(`축하합니다!\n⏱ 소요 시간: ${timerDisplay.innerText}`);
                    }, 100);
                }
            });

            fadeOutPieces.play();
            fadeInFullImage.play();
        }
    }

    if (saveData) {
        horizontalEdges = saveData.horizontalEdges;
        verticalEdges = saveData.verticalEdges;
    } else {
        horizontalEdges = [];
        verticalEdges = [];
        for (let r = 0; r <= ROWS; r++) {
            horizontalEdges[r] = [];
            for (let c = 0; c < COLUMNS; c++) {
                horizontalEdges[r][c] = (r === 0 || r === ROWS) ? 0 : (Math.random() > 0.5 ? 1 : -1);
            }
        }
        for (let r = 0; r < ROWS; r++) {
            verticalEdges[r] = [];
            for (let c = 0; c <= COLUMNS; c++) {
                verticalEdges[r][c] = (c === 0 || c === COLUMNS) ? 0 : (Math.random() > 0.5 ? 1 : -1);
            }
        }
    }

    const tabSize = Math.min(w, h) * 0.22;

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLUMNS; c++) {
            const scaleX = BOARD_WIDTH / uploadedImage.width;
            const scaleY = BOARD_HEIGHT / uploadedImage.height;
            const offsetX = (c * w) / scaleX;
            const offsetY = (r * h) / scaleY;

            const piece = new Konva.Shape({
                name: 'puzzlePiece',
                x: 0, y: 0,
                sceneFunc: function(context, shape) {
                    context.beginPath();
                    context.moveTo(0, 0);

                    if (horizontalEdges[r][c] !== 0) {
                        let dir = horizontalEdges[r][c];
                        context.lineTo(w * 0.38, 0);
                        context.bezierCurveTo(w * 0.38, dir * tabSize * 0.3, w * 0.32, dir * tabSize * 1.1, w * 0.44, dir * tabSize * 1.2);
                        context.bezierCurveTo(w * 0.48, dir * tabSize * 1.25, w * 0.52, dir * tabSize * 1.25, w * 0.56, dir * tabSize * 1.2);
                        context.bezierCurveTo(w * 0.68, dir * tabSize * 1.1, w * 0.62, dir * tabSize * 0.3, w * 0.62, 0);
                    }
                    context.lineTo(w, 0);

                    if (verticalEdges[r][c+1] !== 0) {
                        let dir = verticalEdges[r][c+1];
                        context.lineTo(w, h * 0.38);
                        context.bezierCurveTo(w + dir * tabSize * 0.3, h * 0.38, w + dir * tabSize * 1.1, h * 0.32, w + dir * tabSize * 1.2, h * 0.44);
                        context.bezierCurveTo(w + dir * tabSize * 1.25, h * 0.48, w + dir * tabSize * 1.25, h * 0.52, w + dir * tabSize * 1.2, h * 0.56);
                        context.bezierCurveTo(w + dir * tabSize * 1.1, h * 0.68, w + dir * tabSize * 0.3, h * 0.62, w, h * 0.62);
                    }
                    context.lineTo(w, h);

                    if (horizontalEdges[r+1][c] !== 0) {
                        let dir = horizontalEdges[r+1][c];
                        context.lineTo(w * 0.62, h);
                        context.bezierCurveTo(w * 0.62, h + dir * tabSize * 0.3, w * 0.68, h + dir * tabSize * 1.1, w * 0.56, h + dir * tabSize * 1.2);
                        context.bezierCurveTo(w * 0.52, h + dir * tabSize * 1.25, w * 0.48, h + dir * tabSize * 1.25, w * 0.44, h + dir * tabSize * 1.2);
                        context.bezierCurveTo(w * 0.32, h + dir * tabSize * 1.1, w * 0.38, h + dir * tabSize * 0.3, w * 0.38, h);
                    }
                    context.lineTo(0, h);

                    if (verticalEdges[r][c] !== 0) {
                        let dir = verticalEdges[r][c];
                        context.lineTo(0, h * 0.62);
                        context.bezierCurveTo(dir * tabSize * 0.3, h * 0.62, dir * tabSize * 1.1, h * 0.68, dir * tabSize * 1.2, h * 0.56);
                        context.bezierCurveTo(dir * tabSize * 1.25, h * 0.52, dir * tabSize * 1.25, h * 0.48, dir * tabSize * 1.2, h * 0.44);
                        context.bezierCurveTo(dir * tabSize * 1.1, h * 0.32, dir * tabSize * 0.3, h * 0.38, 0, h * 0.38);
                    }
                    context.lineTo(0, 0);

                    context.closePath();
                    context.fillStrokeShape(shape);
                },
                fillPatternImage: uploadedImage,
                fillPatternScaleX: scaleX,
                fillPatternScaleY: scaleY,
                fillPatternOffset: { x: offsetX, y: offsetY },
                stroke: '#1f1f1f', 
                strokeWidth: 1.2,
                strokeScaleEnabled: false, 
                draggable: true,
                shadowColor: '#000', shadowBlur: 3, shadowOffset: { x: 1, y: 1 }, shadowOpacity: 0.3,
                
                dragBoundFunc: function(pos) {
                    const currentScale = stage.scaleX();
                    const stageX = stage.x();
                    const stageY = stage.y();

                    let minAbsX = stageX + 10 * currentScale;
                    let maxAbsX = stageX + (STAGE_WIDTH - w - 10) * currentScale;
                    let minAbsY = stageY + 10 * currentScale;
                    let maxAbsY = stageY + (STAGE_HEIGHT - h - 10) * currentScale;

                    let clampedX = Math.max(minAbsX, Math.min(pos.x, maxAbsX));
                    let clampedY = Math.max(minAbsY, Math.min(pos.y, maxAbsY));

                    return { x: clampedX, y: clampedY };
                }
            });

            piece.setAttr('row', r);
            piece.setAttr('col', c);
            piece.setAttr('isSolved', false);

            if (saveData) {
                const savedPiece = saveData.pieces.find(p => p.row === r && p.col === c);
                if (savedPiece) {
                    piece.position({ x: savedPiece.x, y: savedPiece.y });
                    piecesGroup.add(piece);
                    
                    if (savedPiece.isSolved) {
                        piece.draggable(false);
                        piece.stroke('#27ae60');
                        piece.shadowOpacity(0);
                        piece.setAttr('isSolved', true);
                        piece.zIndex(fullPerfectImage.zIndex() + 1); 
                    }
                }
            } else {
                let randomX;
                if (Math.random() > 0.5) {
                    randomX = 10 + Math.random() * (boardX - 80 - w);
                } else {
                    const minRightX = boardX + BOARD_WIDTH + 40;
                    const maxRightX = STAGE_WIDTH - w - 20; 
                    randomX = (maxRightX > minRightX) ? minRightX + Math.random() * (maxRightX - minRightX) : minRightX;
                }
                const randomY = 40 + Math.random() * (STAGE_HEIGHT - 120 - h);
                piece.position({ x: randomX, y: randomY });
                piecesGroup.add(piece);
            }

            const targetX = boardX + c * w;
            const targetY = boardY + r * h;

            try {
                const padding = tabSize * 2 + 5; 
                piece.cache({
                    x: -padding,
                    y: -padding,
                    width: w + (padding * 2),
                    height: h + (padding * 2)
                });
            } catch(e) {}

            piece.on('dragstart', () => {
                piece.moveTo(dragLayer); 
                mainLayer.batchDraw(); 
            });

            piece.on('dragend', () => {
                const dist = Math.sqrt(Math.pow(piece.x() - targetX, 2) + Math.pow(piece.y() - targetY, 2));
                if (dist < 20) { 
                    piece.position({ x: targetX, y: targetY });
                    piece.draggable(false); 
                    piece.stroke('#27ae60'); 
                    piece.shadowOpacity(0);
                    
                    piece.setAttr('isSolved', true); 
                    piece.moveTo(piecesGroup);
                    piece.zIndex(fullPerfectImage.zIndex() + 1); 
                    
                    solvedPieces++;
                    checkGameProgress();
                } else {
                    piece.moveTo(piecesGroup);
                }
                
                dragLayer.draw();
                mainLayer.batchDraw();
            });
        }
    }
    
    mainLayer.draw();
}

document.getElementById('puzzle-container').addEventListener('contextmenu', e => e.preventDefault());

// 💾 게임 저장 기능
if (saveBtn) {
    saveBtn.addEventListener('click', () => {
        if (!currentStage) return;

        const piecesData = currentStage.find('.puzzlePiece').map(p => ({
            row: p.getAttr('row'),
            col: p.getAttr('col'),
            x: p.x(),
            y: p.y(),
            isSolved: p.getAttr('isSolved')
        }));

        const saveData = {
            imageSrc: uploadedImage.src,         
            difficulty: maxPieces,               
            secondsElapsed: secondsElapsed,      
            solvedPieces: solvedPieces,          
            horizontalEdges: horizontalEdges,    
            verticalEdges: verticalEdges,
            pieces: piecesData                   
        };

        try {
            localStorage.setItem('myPuzzleSave', JSON.stringify(saveData));
            alert("현재 진행 상황이 저장되었습니다! 💾\n(브라우저를 껐다 켜도 불러올 수 있습니다)");
        } catch (e) {
            alert("저장 공간이 부족합니다! 직접 첨부한 파일 용량이 너무 큽니다.");
        }
    });
}

// 📂 게임 불러오기 기능
if (loadBtn) {
    loadBtn.addEventListener('click', () => {
        const savedString = localStorage.getItem('myPuzzleSave');
        if (!savedString) {
            alert("저장된 게임 데이터가 없습니다.");
            return;
        }

        if (confirm("저장된 게임을 불러오시겠습니까?\n(현재 진행 중인 상태는 사라집니다)")) {
            const saveData = JSON.parse(savedString);
            
            difficultySelect.value = saveData.difficulty;
            galleryImages.forEach(i => i.classList.remove('selected'));
            imageUpload.value = "";
            
            uploadedImage.crossOrigin = "Anonymous";
            uploadedImage.src = saveData.imageSrc;
            
            uploadedImage.onload = () => {
                createFHDJigsawPuzzle(saveData);
            };
        }
    });
}