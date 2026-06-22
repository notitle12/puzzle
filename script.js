const imageUpload = document.getElementById('imageUpload');
const difficultySelect = document.getElementById('difficultySelect');
const startBtn = document.getElementById('startBtn');
const galleryImages = document.querySelectorAll('.gallery-img');
const timerDisplay = document.getElementById('timerDisplay');
const progressDisplay = document.getElementById('progressDisplay');

let uploadedImage = new Image();

const BOARD_WIDTH = 960;  
const BOARD_HEIGHT = 540;
const STAGE_WIDTH = 1840;
const STAGE_HEIGHT = 780;

let timerInterval = null;
let secondsElapsed = 0;
let solvedPieces = 0;
let maxPieces = 0;

imageUpload.addEventListener('change', (e) => {
    galleryImages.forEach(img => img.classList.remove('selected'));
    const reader = new FileReader();
    reader.onload = (event) => {
        uploadedImage.src = event.target.result;
        uploadedImage.onload = () => { startBtn.disabled = false; };
    };
    reader.readAsDataURL(e.target.files[0]);
});

galleryImages.forEach(img => {
    img.addEventListener('click', (e) => {
        galleryImages.forEach(i => i.classList.remove('selected'));
        e.target.classList.add('selected');
        imageUpload.value = "";
        uploadedImage.crossOrigin = "Anonymous"; 
        uploadedImage.src = e.target.src;
        uploadedImage.onload = () => { startBtn.disabled = false; };
    });
});

startBtn.addEventListener('click', createFHDJigsawPuzzle);

function startTimer() {
    clearInterval(timerInterval);
    secondsElapsed = 0;
    timerDisplay.innerText = "00:00";
    
    timerInterval = setInterval(() => {
        secondsElapsed++;
        const mins = String(Math.floor(secondsElapsed / 60)).padStart(2, '0');
        const secs = String(secondsElapsed % 60).padStart(2, '0');
        timerDisplay.innerText = `${mins}:${secs}`;
    }, 1000);
}

function updateProgress() {
    const percent = Math.floor((solvedPieces / maxPieces) * 100);
    progressDisplay.innerText = `${solvedPieces} / ${maxPieces} (${percent}%)`;
    
    if (solvedPieces === maxPieces) {
        clearInterval(timerInterval);
        alert(`축하합니다!(소요 시간: ${timerDisplay.innerText})`);
    }
}

function createFHDJigsawPuzzle() {
    document.getElementById('puzzle-container').innerHTML = '';

    const totalPieces = parseInt(difficultySelect.value);
    maxPieces = totalPieces;
    solvedPieces = 0;
    
    startTimer();
    
    progressDisplay.innerText = `0 / ${maxPieces} (0%)`;

    const COLUMNS = Math.sqrt(totalPieces);
    const ROWS = Math.sqrt(totalPieces);

    const stage = new Konva.Stage({
        container: 'puzzle-container',
        width: STAGE_WIDTH,
        height: STAGE_HEIGHT
    });
    
    const mainLayer = new Konva.Layer(); 
    const dragLayer = new Konva.Layer(); 
    stage.add(mainLayer);
    stage.add(dragLayer);

    // 🔧 [화면 조작 설정] 기본적으로 드래그 시 화면 이동 활성화
    stage.draggable(true);
    let isStageLocked = false; 

    const scaleBy = 1.25; 
    const MIN_SCALE = 1;
    const MAX_SCALE = 6;

    // 화면 중앙 기준 확대/축소 함수
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

    // 🔧 [키보드 이벤트 핸들러] 영문 l, 한글 ㅣ 입력 시 모두 대응하도록 수정
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
            // 🔧 [핵심 수정] e.code === 'KeyL'을 추가해 키보드 자판의 'L' 위치를 누르면 한/영 상관없이 무조건 락 기능 작동
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

    // 1. 외곽 프레임
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

    // 2. 안쪽 프레임 테두리선
    const innerFrameLine = new Konva.Rect({
        x: boardX - 3, y: boardY - 3,
        width: BOARD_WIDTH + 6, height: BOARD_HEIGHT + 6,
        stroke: '#8a6d55', strokeWidth: 1.5,
        listening: false
    });
    mainLayer.add(innerFrameLine);

    // 3. 퍼즐 안쪽 검은색 바닥판
    const board = new Konva.Rect({
        x: boardX, y: boardY,
        width: BOARD_WIDTH, height: BOARD_HEIGHT,
        fill: '#0f0f0f', stroke: '#000000', strokeWidth: 2,
        listening: false
    });
    mainLayer.add(board);

    // 4. 완성 시 통이미지
    const fullPerfectImage = new Konva.Image({
        x: boardX, y: boardY,
        image: uploadedImage,
        width: BOARD_WIDTH, height: BOARD_HEIGHT,
        opacity: 0,
        listening: false
    });
    mainLayer.add(fullPerfectImage);

    // 5. 반투명 가이드 오버레이 (힌트용)
    const transparentGuideImage = new Konva.Image({
        x: boardX, y: boardY,
        image: uploadedImage,
        width: BOARD_WIDTH, height: BOARD_HEIGHT,
        opacity: 0.45, 
        visible: false,
        listening: false
    });
    mainLayer.add(transparentGuideImage);

    // 우측 상단 미니 예시 이미지 가이드
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

    // 현재 락 상태를 텍스트에 반영하는 함수
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

    // 퍼즐 조각 그룹 생성
    const piecesGroup = new Konva.Group();
    mainLayer.add(piecesGroup);

    function checkGameProgress() {
        const percent = Math.floor((solvedPieces / maxPieces) * 100);
        progressDisplay.innerText = `${solvedPieces} / ${maxPieces} (${percent}%)`;
        
        if (solvedPieces === maxPieces) {
            clearInterval(timerInterval);
            transparentGuideImage.visible(false);

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

    let horizontalEdges = [];
    let verticalEdges = [];

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

    const tabSize = Math.min(w, h) * 0.22;

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLUMNS; c++) {

            const scaleX = BOARD_WIDTH / uploadedImage.width;
            const scaleY = BOARD_HEIGHT / uploadedImage.height;
            const offsetX = (c * w) / scaleX;
            const offsetY = (r * h) / scaleY;

            const piece = new Konva.Shape({
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

            piecesGroup.add(piece);
        }
    }
    
    mainLayer.draw();
}

document.getElementById('puzzle-container').addEventListener('contextmenu', e => e.preventDefault());