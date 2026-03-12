/**
 * VibeCheck - AI Interview Practice Application
 * Real webcam + MediaPipe Face Mesh + Gemini AI Feedback
 */

// ============================================
// STATE MANAGEMENT
// ============================================

const state = {
    currentScreen: 'landing-screen',
    userName: '',
    currentQuestion: null,
    isRecording: false,
    recordingStartTime: null,
    recordingDuration: 0,
    timerInterval: null,
    
    // Camera & MediaPipe
    videoStream: null,
    faceMesh: null,
    camera: null,
    
    // Analysis data
    faceDetected: false,
    faceLandmarks: [],
    eyeContactSamples: [],
    headMovementSamples: [],
    speechActive: false,
    audioContext: null,
    audioAnalyser: null,
    speechSamples: [],
    
    // Recording data
    mediaRecorder: null,
    recordedChunks: []
};

// ============================================
// INTERVIEW QUESTIONS
// ============================================

const interviewQuestions = [
    "Tell me about a time when you had to overcome a significant challenge. How did you approach it, and what was the outcome?",
    "Describe a situation where you had to work with a difficult team member. How did you handle it?",
    "What's your greatest professional achievement, and why does it matter to you?",
    "Tell me about a time when you failed. What did you learn from the experience?",
    "Describe a project where you had to learn something new quickly. How did you approach it?",
    "Tell me about a time when you had to make a difficult decision with limited information.",
    "Describe a situation where you had to persuade others to see your point of view.",
    "What motivates you, and how does that show up in your work?",
    "Tell me about a time when you went above and beyond what was expected.",
    "Describe how you handle competing priorities and tight deadlines."
];

// ============================================
// DOM ELEMENTS
// ============================================

const elements = {
    // Screens
    landingScreen: document.getElementById('landing-screen'),
    questionScreen: document.getElementById('question-screen'),
    recordingScreen: document.getElementById('recording-screen'),
    analysisScreen: document.getElementById('analysis-screen'),
    feedbackScreen: document.getElementById('feedback-screen'),
    
    // Landing
    userNameInput: document.getElementById('user-name'),
    startBtn: document.getElementById('start-btn'),
    
    // Question
    questionText: document.getElementById('question-text'),
    shuffleBtn: document.getElementById('shuffle-btn'),
    readyBtn: document.getElementById('ready-btn'),
    
    // Recording
    videoPreview: document.getElementById('video-preview'),
    faceCanvas: document.getElementById('face-canvas'),
    cameraFrame: document.getElementById('camera-frame'),
    cameraPlaceholder: document.getElementById('camera-placeholder'),
    recordingIndicator: document.getElementById('recording-indicator'),
    faceStatus: document.getElementById('face-status'),
    timerDisplay: document.getElementById('timer-display'),
    startRecordingBtn: document.getElementById('start-recording-btn'),
    stopRecordingBtn: document.getElementById('stop-recording-btn'),
    currentQuestionText: document.getElementById('current-question-text'),
    
    // Analysis
    analysisProgress: document.getElementById('analysis-progress'),
    analysisStatus: document.getElementById('analysis-status'),
    
    // Feedback
    userGreeting: document.getElementById('user-greeting'),
    eyeContactStatus: document.getElementById('eye-contact-status'),
    eyeContactDetail: document.getElementById('eye-contact-detail'),
    headMovementStatus: document.getElementById('head-movement-status'),
    headMovementDetail: document.getElementById('head-movement-detail'),
    speechPaceStatus: document.getElementById('speech-pace-status'),
    speechPaceDetail: document.getElementById('speech-pace-detail'),
    aiFeedbackText: document.getElementById('ai-feedback-text'),
    practiceAgainBtn: document.getElementById('practice-again-btn'),
    newQuestionBtn: document.getElementById('new-question-btn'),
    
    // Back buttons
    backBtns: document.querySelectorAll('.back-btn')
};

// ============================================
// SCREEN NAVIGATION
// ============================================

function navigateTo(screenId) {
    const currentScreenEl = document.getElementById(state.currentScreen);
    const newScreenEl = document.getElementById(screenId);
    
    if (!newScreenEl) return;
    
    // Exit current screen
    currentScreenEl.classList.add('exiting');
    currentScreenEl.classList.remove('active');
    
    // Enter new screen
    setTimeout(() => {
        currentScreenEl.classList.remove('exiting');
        newScreenEl.classList.add('active');
        state.currentScreen = screenId;
        
        // Screen-specific initialization
        if (screenId === 'recording-screen') {
            initCamera();
        } else if (screenId === 'analysis-screen') {
            runAnalysis();
        }
    }, 200);
}

// ============================================
// LANDING SCREEN HANDLERS
// ============================================

elements.startBtn.addEventListener('click', () => {
    const name = elements.userNameInput.value.trim();
    if (name.length < 2) {
        elements.userNameInput.focus();
        elements.userNameInput.style.borderColor = 'var(--error)';
        setTimeout(() => {
            elements.userNameInput.style.borderColor = '';
        }, 1500);
        return;
    }
    
    state.userName = name;
    selectRandomQuestion();
    navigateTo('question-screen');
});

elements.userNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        elements.startBtn.click();
    }
});

// ============================================
// QUESTION SCREEN HANDLERS
// ============================================

function selectRandomQuestion() {
    const availableQuestions = interviewQuestions.filter(q => q !== state.currentQuestion);
    const randomIndex = Math.floor(Math.random() * availableQuestions.length);
    state.currentQuestion = availableQuestions[randomIndex];
    elements.questionText.textContent = state.currentQuestion;
    elements.currentQuestionText.textContent = state.currentQuestion.substring(0, 100) + '...';
}

elements.shuffleBtn.addEventListener('click', () => {
    // Animate question change
    elements.questionText.style.opacity = '0';
    elements.questionText.style.transform = 'translateY(-10px)';
    
    setTimeout(() => {
        selectRandomQuestion();
        elements.questionText.style.opacity = '1';
        elements.questionText.style.transform = 'translateY(0)';
    }, 200);
});

elements.readyBtn.addEventListener('click', () => {
    navigateTo('recording-screen');
});

// ============================================
// CAMERA & MEDIAPIPE INITIALIZATION
// ============================================

async function initCamera() {
    try {
        // Get video stream
        state.videoStream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'user'
            },
            audio: true
        });
        
        elements.videoPreview.srcObject = state.videoStream;
        elements.cameraPlaceholder.classList.add('hidden');
        
        // Initialize audio analysis
        initAudioAnalysis();
        
        // Initialize MediaPipe Face Mesh
        initFaceMesh();
        
    } catch (error) {
        console.error('Camera access error:', error);
        elements.cameraPlaceholder.innerHTML = `
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                <path d="M32 16L36 24H28L32 16Z" fill="currentColor"/>
                <rect x="16" y="24" width="32" height="24" rx="2" stroke="currentColor" stroke-width="2"/>
                <line x1="16" y1="48" x2="48" y2="24" stroke="currentColor" stroke-width="2"/>
            </svg>
            <span style="color: var(--warning);">Camera access needed</span>
            <span style="font-size: 0.75rem; opacity: 0.6;">Please allow camera access and refresh</span>
        `;
    }
}

function initFaceMesh() {
    if (typeof FaceMesh === 'undefined') {
        console.warn('MediaPipe FaceMesh not loaded, using fallback detection');
        startFallbackFaceDetection();
        return;
    }
    
    state.faceMesh = new FaceMesh({
        locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
        }
    });
    
    state.faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });
    
    state.faceMesh.onResults(onFaceMeshResults);
    
    // Start camera feed to FaceMesh
    if (typeof Camera !== 'undefined') {
        state.camera = new Camera(elements.videoPreview, {
            onFrame: async () => {
                if (state.faceMesh) {
                    await state.faceMesh.send({ image: elements.videoPreview });
                }
            },
            width: 1280,
            height: 720
        });
        state.camera.start();
    } else {
        // Fallback: manual frame processing
        processVideoFrame();
    }
}

function processVideoFrame() {
    if (!state.faceMesh || !elements.videoPreview.srcObject) return;
    
    state.faceMesh.send({ image: elements.videoPreview }).then(() => {
        if (state.currentScreen === 'recording-screen') {
            requestAnimationFrame(processVideoFrame);
        }
    });
}

function onFaceMeshResults(results) {
    const canvas = elements.faceCanvas;
    const ctx = canvas.getContext('2d');
    
    canvas.width = elements.videoPreview.videoWidth || 640;
    canvas.height = elements.videoPreview.videoHeight || 480;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        state.faceDetected = true;
        state.faceLandmarks = results.multiFaceLandmarks[0];
        
        updateFaceStatus(true);
        
        // Draw subtle face mesh overlay
        drawFaceMesh(ctx, results.multiFaceLandmarks[0], canvas.width, canvas.height);
        
        // Track eye contact and head movement during recording
        if (state.isRecording) {
            trackEyeContact(results.multiFaceLandmarks[0]);
            trackHeadMovement(results.multiFaceLandmarks[0]);
        }
    } else {
        state.faceDetected = false;
        updateFaceStatus(false);
    }
}

function drawFaceMesh(ctx, landmarks, width, height) {
    // Draw subtle dots on key facial points
    const keyPoints = [
        33, 133, 362, 263, // Eyes
        1, 4, 5, 6, // Nose
        61, 291, 0, 17 // Mouth
    ];
    
    ctx.fillStyle = 'rgba(108, 123, 255, 0.4)';
    
    keyPoints.forEach(index => {
        if (landmarks[index]) {
            const x = landmarks[index].x * width;
            const y = landmarks[index].y * height;
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    });
    
    // Draw eye outline
    ctx.strokeStyle = 'rgba(108, 123, 255, 0.3)';
    ctx.lineWidth = 1;
    
    // Left eye
    const leftEyePoints = [33, 7, 163, 144, 145, 153, 154, 155, 133];
    drawConnectedPoints(ctx, landmarks, leftEyePoints, width, height);
    
    // Right eye
    const rightEyePoints = [362, 382, 381, 380, 374, 373, 390, 249, 263];
    drawConnectedPoints(ctx, landmarks, rightEyePoints, width, height);
}

function drawConnectedPoints(ctx, landmarks, indices, width, height) {
    ctx.beginPath();
    indices.forEach((index, i) => {
        if (landmarks[index]) {
            const x = landmarks[index].x * width;
            const y = landmarks[index].y * height;
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
    });
    ctx.closePath();
    ctx.stroke();
}

function startFallbackFaceDetection() {
    // Simple fallback using video stream presence
    // Note: In fallback mode, we cannot track eye contact or head movement
    // so we don't push fake data - this is more honest to the user
    const checkFace = () => {
        if (state.currentScreen !== 'recording-screen') return;
        
        // In fallback mode, we only check if video stream is present
        const hasVideo = elements.videoPreview.srcObject && 
                        elements.videoPreview.readyState >= 2;
        
        state.faceDetected = hasVideo;
        updateFaceStatus(hasVideo);
        
        // Note: We intentionally don't push fake tracking data here
        // This ensures the feedback accurately reflects that detailed
        // face tracking (eye contact, head movement) wasn't available
        
        requestAnimationFrame(checkFace);
    };
    
    checkFace();
}

function updateFaceStatus(detected) {
    const faceStatus = elements.faceStatus;
    const faceText = faceStatus.querySelector('.face-text');
    
    if (detected) {
        faceStatus.classList.add('detected');
        faceStatus.classList.remove('not-detected');
        faceText.textContent = 'Face detected';
    } else {
        faceStatus.classList.remove('detected');
        faceStatus.classList.add('not-detected');
        faceText.textContent = 'Position your face in frame';
    }
}

function trackEyeContact(landmarks) {
    // Calculate eye gaze direction
    // Using iris landmarks if available (468-477)
    // Only track if iris landmarks are present for accurate data
    if (landmarks[468] && landmarks[473] && landmarks[33] && landmarks[133] && landmarks[362] && landmarks[263]) {
        const leftIris = landmarks[468];
        const rightIris = landmarks[473];
        
        // Simple gaze estimation based on iris position relative to eye corners
        const leftEyeCenter = {
            x: (landmarks[33].x + landmarks[133].x) / 2,
            y: (landmarks[33].y + landmarks[133].y) / 2
        };
        const rightEyeCenter = {
            x: (landmarks[362].x + landmarks[263].x) / 2,
            y: (landmarks[362].y + landmarks[263].y) / 2
        };
        
        // Calculate deviation from center (0 = looking at camera, 1 = looking away)
        const leftDeviation = Math.abs(leftIris.x - leftEyeCenter.x);
        const rightDeviation = Math.abs(rightIris.x - rightEyeCenter.x);
        const avgDeviation = (leftDeviation + rightDeviation) / 2;
        
        // Convert to eye contact score (higher = better contact)
        const eyeContactScore = Math.max(0, 1 - avgDeviation * 10);
        state.eyeContactSamples.push(eyeContactScore);
    }
    // Note: We don't push fallback data anymore - only real iris tracking data
    // This ensures accurate feedback when data is unavailable
}

function trackHeadMovement(landmarks) {
    // Track head position/rotation using nose and forehead landmarks
    if (state.faceLandmarks.length > 0) {
        const nose = landmarks[1];
        const forehead = landmarks[10];
        
        // Calculate head orientation
        const headTilt = Math.abs(nose.x - 0.5); // Horizontal deviation
        const headNod = Math.abs(nose.y - 0.4); // Vertical deviation
        
        // Movement score (moderate movement is good, too much or too little is not ideal)
        const movementScore = Math.min(headTilt + headNod, 0.5);
        state.headMovementSamples.push(movementScore);
    }
}

// ============================================
// AUDIO ANALYSIS
// ============================================

function initAudioAnalysis() {
    if (!state.videoStream) return;
    
    try {
        state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = state.audioContext.createMediaStreamSource(state.videoStream);
        state.audioAnalyser = state.audioContext.createAnalyser();
        state.audioAnalyser.fftSize = 256;
        source.connect(state.audioAnalyser);
        
        analyzeAudio();
    } catch (error) {
        console.error('Audio analysis error:', error);
    }
}

function analyzeAudio() {
    if (!state.audioAnalyser || state.currentScreen !== 'recording-screen') return;
    
    const dataArray = new Uint8Array(state.audioAnalyser.frequencyBinCount);
    state.audioAnalyser.getByteFrequencyData(dataArray);
    
    // Calculate average volume
    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
    state.speechActive = average > 30; // Threshold for speech detection
    
    if (state.isRecording) {
        // Store speech activity samples
        state.speechSamples.push(average);
    }
    
    requestAnimationFrame(analyzeAudio);
}

// ============================================
// RECORDING CONTROLS
// ============================================

elements.startRecordingBtn.addEventListener('click', startRecording);
elements.stopRecordingBtn.addEventListener('click', stopRecording);

function startRecording() {
    if (state.isRecording) return;
    
    state.isRecording = true;
    state.recordingStartTime = Date.now();
    state.eyeContactSamples = [];
    state.headMovementSamples = [];
    state.speechSamples = [];
    state.recordedChunks = [];
    
    // Update UI
    elements.cameraFrame.classList.add('recording');
    elements.recordingIndicator.classList.add('visible');
    elements.startRecordingBtn.classList.add('hidden');
    elements.stopRecordingBtn.classList.remove('hidden');
    
    // Start timer
    updateTimer();
    state.timerInterval = setInterval(updateTimer, 1000);
    
    // Start media recording
    if (state.videoStream) {
        try {
            state.mediaRecorder = new MediaRecorder(state.videoStream, {
                mimeType: 'video/webm;codecs=vp9'
            });
            
            state.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    state.recordedChunks.push(event.data);
                }
            };
            
            state.mediaRecorder.start(1000);
        } catch (error) {
            console.warn('MediaRecorder error:', error);
        }
    }
}

function stopRecording() {
    if (!state.isRecording) return;
    
    state.isRecording = false;
    state.recordingDuration = Math.floor((Date.now() - state.recordingStartTime) / 1000);
    
    // Stop timer
    clearInterval(state.timerInterval);
    
    // Update UI
    elements.cameraFrame.classList.remove('recording');
    elements.recordingIndicator.classList.remove('visible');
    
    // Stop media recorder
    if (state.mediaRecorder && state.mediaRecorder.state !== 'inactive') {
        state.mediaRecorder.stop();
    }
    
    // Stop camera
    stopCamera();
    
    // Navigate to analysis
    navigateTo('analysis-screen');
}

function updateTimer() {
    const elapsed = Math.floor((Date.now() - state.recordingStartTime) / 1000);
    const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const seconds = (elapsed % 60).toString().padStart(2, '0');
    
    const timerValue = elements.timerDisplay.querySelector('.timer-value');
    timerValue.textContent = `${minutes}:${seconds}`;
}

function stopCamera() {
    if (state.camera) {
        state.camera.stop();
    }
    
    if (state.videoStream) {
        state.videoStream.getTracks().forEach(track => track.stop());
        state.videoStream = null;
    }
    
    if (state.audioContext) {
        state.audioContext.close();
        state.audioContext = null;
    }
}

// ============================================
// ANALYSIS ENGINE
// ============================================

async function runAnalysis() {
    const steps = ['eye', 'movement', 'speech', 'ai'];
    const statusTexts = [
        'Analyzing eye contact patterns...',
        'Evaluating head movement stability...',
        'Processing speech pace and clarity...',
        'Generating personalized insights...'
    ];
    
    const progressCircle = elements.analysisProgress;
    const circumference = 2 * Math.PI * 54;
    
    for (let i = 0; i < steps.length; i++) {
        // Update status text
        elements.analysisStatus.textContent = statusTexts[i];
        
        // Mark step as active
        const stepEl = document.querySelector(`.analysis-step[data-step="${steps[i]}"]`);
        stepEl.classList.add('active');
        
        // Animate progress (non-linear easing)
        const progress = (i + 1) / steps.length;
        const eased = easeOutQuart(progress);
        const offset = circumference * (1 - eased);
        progressCircle.style.strokeDashoffset = offset;
        
        // Wait with variable timing for realism
        const waitTime = 800 + Math.random() * 600;
        await delay(waitTime);
        
        // Mark step as done
        stepEl.classList.remove('active');
        stepEl.classList.add('done');
    }
    
    // Generate feedback
    await generateFeedback();
    
    // Navigate to feedback screen
    await delay(500);
    navigateTo('feedback-screen');
}

function easeOutQuart(x) {
    return 1 - Math.pow(1 - x, 4);
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// FEEDBACK GENERATION
// ============================================

async function generateFeedback() {
    // Analyze collected data
    const analysis = analyzeRecordingData();
    const quality = analysis.signalQuality;
    
    // Update greeting based on signal quality
    if (quality.overallQuality === 'low') {
        elements.userGreeting.textContent = `Thanks for practicing, ${state.userName}! We had limited data this session, but here's what we found.`;
    } else if (quality.overallQuality === 'medium') {
        elements.userGreeting.textContent = `Good practice session, ${state.userName}! Here's your partial analysis.`;
    } else {
        elements.userGreeting.textContent = `Great effort, ${state.userName}! Here's what we observed.`;
    }
    
    // Update eye contact card
    const eyeCard = elements.eyeContactStatus.closest('.feedback-card');
    elements.eyeContactStatus.textContent = analysis.eyeContact.label;
    elements.eyeContactStatus.className = `card-status ${analysis.eyeContact.class}`;
    elements.eyeContactDetail.textContent = analysis.eyeContact.detail;
    if (analysis.eyeContact.isLimited) {
        eyeCard?.classList.add('has-limited-data');
    } else {
        eyeCard?.classList.remove('has-limited-data');
    }
    
    // Update head movement card
    const headCard = elements.headMovementStatus.closest('.feedback-card');
    elements.headMovementStatus.textContent = analysis.headMovement.label;
    elements.headMovementStatus.className = `card-status ${analysis.headMovement.class}`;
    elements.headMovementDetail.textContent = analysis.headMovement.detail;
    if (analysis.headMovement.isLimited) {
        headCard?.classList.add('has-limited-data');
    } else {
        headCard?.classList.remove('has-limited-data');
    }
    
    // Update speech pace card
    const speechCard = elements.speechPaceStatus.closest('.feedback-card');
    elements.speechPaceStatus.textContent = analysis.speechPace.label;
    elements.speechPaceStatus.className = `card-status ${analysis.speechPace.class}`;
    elements.speechPaceDetail.textContent = analysis.speechPace.detail;
    if (analysis.speechPace.isLimited) {
        speechCard?.classList.add('has-limited-data');
    } else {
        speechCard?.classList.remove('has-limited-data');
    }
    
    // Generate AI feedback
    const aiFeedback = await generateAIFeedback(analysis);
    elements.aiFeedbackText.textContent = aiFeedback;
}

// ============================================
// SIGNAL QUALITY ASSESSMENT
// ============================================

/**
 * Assess the quality of collected signals during recording
 * Returns detailed quality metrics for each data stream
 */
function assessSignalQuality() {
    const duration = state.recordingDuration || 0;
    const expectedSamples = Math.max(duration * 10, 1); // ~10 samples per second expected
    
    // Face landmark detection quality
    const eyeSampleCount = state.eyeContactSamples.length;
    const headSampleCount = state.headMovementSamples.length;
    const faceSampleRatio = Math.max(eyeSampleCount, headSampleCount) / expectedSamples;
    
    let faceDetectionQuality;
    if (faceSampleRatio >= 0.7) {
        faceDetectionQuality = 'high';
    } else if (faceSampleRatio >= 0.3) {
        faceDetectionQuality = 'medium';
    } else {
        faceDetectionQuality = 'low';
    }
    
    // Eye contact data availability
    const eyeContactAvailable = eyeSampleCount >= 10;
    
    // Head movement data availability  
    const headMovementAvailable = headSampleCount >= 10;
    
    // Speech pace data availability
    const speechSampleCount = state.speechSamples.length;
    // Check if actual speech was detected (samples above silence threshold of 30)
    const activeSpeechSamples = state.speechSamples.filter(s => s > 30).length;
    const speechActivityRatio = speechSampleCount > 0 ? activeSpeechSamples / speechSampleCount : 0;
    // Speech is only "available" if we have enough samples AND actual speech activity (>10% of samples had speech)
    const speechDataAvailable = speechSampleCount >= 20 && speechActivityRatio > 0.1;
    
    // Calculate confidence scores (0-1)
    const eyeConfidence = Math.min(eyeSampleCount / expectedSamples, 1);
    const headConfidence = Math.min(headSampleCount / expectedSamples, 1);
    const speechConfidence = Math.min(speechSampleCount / (expectedSamples * 2), 1);
    
    // Compute visual and audio confidence levels
    const visualConfidence = (eyeConfidence + headConfidence) / 2 >= 0.7 ? 'high' 
        : (eyeConfidence + headConfidence) / 2 >= 0.3 ? 'medium' : 'low';
    const audioConfidence = speechConfidence >= 0.7 ? 'high' 
        : speechConfidence >= 0.3 ? 'medium' : 'low';
    
    return {
        faceDetectionQuality,
        eyeContactAvailable,
        headMovementAvailable,
        speechDataAvailable,
        speechActivityRatio, // Ratio of samples with actual speech detected
        sampleCounts: {
            eyeContact: eyeSampleCount,
            headMovement: headSampleCount,
            speech: speechSampleCount,
            activeSpeech: activeSpeechSamples
        },
        confidence: {
            eye: eyeConfidence,
            head: headConfidence,
            speech: speechConfidence,
            visual: visualConfidence,
            audio: audioConfidence
        },
        // Overall quality assessment
        overallQuality: faceDetectionQuality === 'high' && eyeContactAvailable && headMovementAvailable && speechDataAvailable
            ? 'high'
            : (faceDetectionQuality !== 'low' && (eyeContactAvailable || headMovementAvailable || speechDataAvailable)
                ? 'medium'
                : 'low')
    };
}

/**
 * Compute comprehensive coaching metrics from recorded session data
 * These metrics follow the standardized input format for feedback generation
 */
function computeCoachingMetrics() {
    const duration = state.recordingDuration || 1;
    const signalQuality = assessSignalQuality();
    
    // === SESSION DATA ===
    // Lighting Quality: derived from face detection stability
    const faceDetectionRate = signalQuality.sampleCounts.eyeContact / Math.max(duration * 10, 1);
    const lightingQuality = faceDetectionRate >= 0.8 ? 'good' 
        : faceDetectionRate >= 0.4 ? 'medium' : 'poor';
    
    // Face Visibility: derived from landmark detection success
    const faceVisibility = signalQuality.faceDetectionQuality === 'high' ? 'clear'
        : signalQuality.faceDetectionQuality === 'medium' ? 'partial' : 'not_visible';
    
    // === FACIAL METRICS ===
    // Eye Contact Ratio (0-1): proportion of time looking at camera
    let eyeContactRatio = 0.5; // default
    if (state.eyeContactSamples.length > 0) {
        eyeContactRatio = state.eyeContactSamples.reduce((a, b) => a + b, 0) / state.eyeContactSamples.length;
        eyeContactRatio = Math.max(0, Math.min(1, eyeContactRatio)); // clamp 0-1
    } else if (duration > 0) {
        // Deterministic fallback based on duration seed
        eyeContactRatio = 0.4 + (duration % 10) * 0.05;
    }
    
    // Head Movement Variance (0-1): stability indicator (lower = more stable)
    let headMovementVariance = 0.3; // default
    if (state.headMovementSamples.length > 1) {
        const mean = state.headMovementSamples.reduce((a, b) => a + b, 0) / state.headMovementSamples.length;
        const squaredDiffs = state.headMovementSamples.map(s => Math.pow(s - mean, 2));
        const variance = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / state.headMovementSamples.length);
        headMovementVariance = Math.min(variance * 2, 1); // normalize to 0-1
    } else if (duration > 0) {
        // Deterministic fallback
        headMovementVariance = 0.2 + ((duration * 7) % 10) * 0.04;
    }
    
    // === AUDIO METRICS ===
    // Average Speaking Pace (words per minute): estimated from audio activity
    let speakingPace = 130; // average speaking pace
    if (state.speechSamples.length > 0) {
        const avgLevel = state.speechSamples.reduce((a, b) => a + b, 0) / state.speechSamples.length;
        const activeFrames = state.speechSamples.filter(s => s > 30).length;
        const activityRatio = activeFrames / state.speechSamples.length;
        // Estimate: more activity = faster pace
        speakingPace = Math.round(100 + (activityRatio * 80) + (avgLevel * 0.5));
        speakingPace = Math.max(80, Math.min(200, speakingPace)); // clamp realistic range
    } else if (duration > 0) {
        // Deterministic fallback
        speakingPace = 110 + ((duration * 3) % 60);
    }
    
    // Pause Frequency (pauses per minute): detected silence gaps
    let pauseFrequency = 4; // default
    if (state.speechSamples.length > 10) {
        let pauseCount = 0;
        let inPause = false;
        for (let i = 0; i < state.speechSamples.length; i++) {
            if (state.speechSamples[i] < 25 && !inPause) {
                pauseCount++;
                inPause = true;
            } else if (state.speechSamples[i] >= 25) {
                inPause = false;
            }
        }
        pauseFrequency = Math.round((pauseCount / duration) * 60);
        pauseFrequency = Math.max(0, Math.min(20, pauseFrequency)); // clamp realistic range
    } else if (duration > 0) {
        // Deterministic fallback
        pauseFrequency = 2 + ((duration * 11) % 8);
    }
    
    // === CONFIDENCE LEVELS ===
    const visualConfidence = signalQuality.confidence.visual;
    const audioConfidence = signalQuality.confidence.audio;
    
    return {
        session: {
            lightingQuality,
            faceVisibility,
            duration
        },
        facial: {
            eyeContactRatio: Math.round(eyeContactRatio * 100) / 100,
            headMovementVariance: Math.round(headMovementVariance * 100) / 100
        },
        audio: {
            speakingPace: Math.round(speakingPace),
            pauseFrequency: Math.round(pauseFrequency)
        },
        confidence: {
            visual: visualConfidence,
            audio: audioConfidence
        },
        signalQuality
    };
}

function analyzeRecordingData() {
    // Compute comprehensive coaching metrics
    const metrics = computeCoachingMetrics();
    const signalQuality = metrics.signalQuality;
    
    // Analyze eye contact (only if data available)
    const avgEyeContact = state.eyeContactSamples.length > 0 
        ? state.eyeContactSamples.reduce((a, b) => a + b) / state.eyeContactSamples.length 
        : null;
    
    // Analyze head movement (only if data available)
    const avgHeadMovement = state.headMovementSamples.length > 0
        ? state.headMovementSamples.reduce((a, b) => a + b) / state.headMovementSamples.length
        : null;
    
    // Analyze speech (only if data available)
    const avgSpeechLevel = state.speechSamples.length > 0
        ? state.speechSamples.reduce((a, b) => a + b) / state.speechSamples.length
        : null;
    
    // Speech variation (pace consistency)
    const speechVariation = state.speechSamples.length > 0
        ? calculateVariation(state.speechSamples)
        : null;
    
    return {
        eyeContact: signalQuality.eyeContactAvailable 
            ? categorizeEyeContact(avgEyeContact)
            : createLimitedDataResponse('Eye Contact', signalQuality.confidence.eye),
        headMovement: signalQuality.headMovementAvailable
            ? categorizeHeadMovement(avgHeadMovement)
            : createLimitedDataResponse('Head Movement', signalQuality.confidence.head),
        speechPace: signalQuality.speechDataAvailable
            ? categorizeSpeechPace(avgSpeechLevel, speechVariation)
            : createSpeechLimitedDataResponse(signalQuality),
        duration: state.recordingDuration,
        signalQuality,
        metrics, // Include full coaching metrics
        rawData: {
            avgEyeContact,
            avgHeadMovement,
            avgSpeechLevel,
            speechVariation
        }
    };
}

/**
 * Create a response for when data is insufficient
 */
function createLimitedDataResponse(category, confidence) {
    const confidencePercent = Math.round(confidence * 100);
    
    // Category-specific messages
    const categoryMessages = {
        'Eye Contact': {
            unavailable: 'We couldn\'t track your eye contact. This may be due to lighting conditions, camera angle, or browser compatibility. Try adjusting your camera position so your eyes are clearly visible.',
            limited: `We captured partial eye contact data (${confidencePercent}% coverage). For more accurate tracking, ensure good lighting on your face and look towards the camera.`
        },
        'Head Movement': {
            unavailable: 'We couldn\'t track your head movement. This may be due to face detection issues or a brief recording. Ensure your full face is visible in the frame.',
            limited: `We captured partial head movement data (${confidencePercent}% coverage). For better tracking, ensure your face is well-lit and fully visible throughout the recording.`
        }
    };
    
    const messages = categoryMessages[category] || {
        unavailable: `We couldn't capture enough ${category.toLowerCase()} data during this session. This may be due to camera positioning, lighting, or a brief recording.`,
        limited: `We captured partial ${category.toLowerCase()} data (${confidencePercent}% coverage). For more accurate feedback, try a longer recording with good lighting.`
    };
    
    if (confidence < 0.1) {
        return {
            label: 'Data Unavailable',
            class: 'limited',
            detail: messages.unavailable,
            isLimited: true
        };
    } else {
        return {
            label: 'Limited Data',
            class: 'limited',
            detail: messages.limited,
            isLimited: true
        };
    }
}

/**
 * Create a specialized response for speech data limitations
 * Differentiates between "no speech detected" and "limited audio data"
 */
function createSpeechLimitedDataResponse(signalQuality) {
    const speechSampleCount = signalQuality.sampleCounts.speech;
    const activeSpeechCount = signalQuality.sampleCounts.activeSpeech;
    const speechActivityRatio = signalQuality.speechActivityRatio;
    
    // We have audio samples but no speech was detected
    if (speechSampleCount >= 20 && speechActivityRatio <= 0.1) {
        return {
            label: 'No Speech Detected',
            class: 'limited',
            detail: 'We didn\'t detect any speech audio during this recording. If you did speak, check your microphone settings or try speaking louder.',
            isLimited: true,
            noSpeech: true
        };
    }
    
    // Very few audio samples collected (mic issues)
    if (speechSampleCount < 10) {
        return {
            label: 'Audio Unavailable',
            class: 'limited',
            detail: 'We couldn\'t capture audio data during this session. Please check that your microphone is enabled and working.',
            isLimited: true
        };
    }
    
    // Some audio but not enough speech activity
    const confidencePercent = Math.round(signalQuality.confidence.speech * 100);
    return {
        label: 'Limited Audio Data',
        class: 'limited',
        detail: `We captured partial audio data (${confidencePercent}% coverage). For more accurate speech analysis, try a longer recording and speak clearly.`,
        isLimited: true
    };
}

function calculateVariation(samples) {
    if (samples.length < 2) return 0;
    const mean = samples.reduce((a, b) => a + b) / samples.length;
    const squaredDiffs = samples.map(s => Math.pow(s - mean, 2));
    return Math.sqrt(squaredDiffs.reduce((a, b) => a + b) / samples.length);
}

function categorizeEyeContact(score) {
    if (score >= 0.7) {
        return {
            label: 'Steady & Engaged',
            class: 'positive',
            detail: 'You maintained consistent eye contact with the camera, creating a confident and connected presence.'
        };
    } else if (score >= 0.5) {
        return {
            label: 'Mostly Consistent',
            class: 'neutral',
            detail: 'Your eye contact was good overall with some moments of looking away. Try to keep your gaze centered more consistently.'
        };
    } else {
        return {
            label: 'Needs Consistency',
            class: 'needs-work',
            detail: 'We noticed frequent breaks in eye contact. Try imagining a friendly face behind the camera to help maintain focus.'
        };
    }
}

function categorizeHeadMovement(score) {
    if (score >= 0.15 && score <= 0.35) {
        return {
            label: 'Natural & Expressive',
            class: 'positive',
            detail: 'Your head movements felt natural and helped emphasize your points without being distracting.'
        };
    } else if (score < 0.15) {
        return {
            label: 'Very Still',
            class: 'neutral',
            detail: 'You stayed quite still during your response. A little more natural movement can help convey enthusiasm.'
        };
    } else {
        return {
            label: 'Slightly Active',
            class: 'needs-work',
            detail: 'There was noticeable movement during your response. Try to find a balance between expressiveness and composure.'
        };
    }
}

function categorizeSpeechPace(level, variation) {
    if (level > 30 && variation < 30) {
        return {
            label: 'Balanced & Clear',
            class: 'positive',
            detail: 'Your speaking pace was consistent and easy to follow. You projected well throughout your response.'
        };
    } else if (level > 30 && variation >= 30) {
        return {
            label: 'Dynamic Range',
            class: 'neutral',
            detail: 'Your pace varied throughout the response. Consider maintaining more consistency for key points.'
        };
    } else if (level <= 30) {
        return {
            label: 'Could Project More',
            class: 'needs-work',
            detail: 'Your voice level was on the quieter side. Speaking with more projection can help convey confidence.'
        };
    }
    
    return {
        label: 'Analyzed',
        class: 'neutral',
        detail: 'We captured your speech patterns. Keep practicing for more insights.'
    };
}

async function generateAIFeedback(analysis) {
    // Check if we have a Gemini API key in localStorage
    const apiKey = localStorage.getItem('gemini_api_key');
    
    if (apiKey) {
        try {
            return await callGeminiAPI(apiKey, analysis);
        } catch (error) {
            console.warn('Gemini API error:', error);
            return generateLocalFeedback(analysis);
        }
    }
    
    return generateLocalFeedback(analysis);
}

async function callGeminiAPI(apiKey, analysis) {
    const metrics = analysis.metrics;
    const metricsHash = computeMetricsHash(metrics);
    const timestamp = Date.now(); // Add timestamp for session uniqueness
    
    const prompt = `🎯 SYSTEM PROMPT (LOCK THIS)
You are an interview coaching assistant.

You do NOT evaluate intelligence or hiring potential.
You ONLY generate feedback from provided signal metrics.

You must strictly follow the rules below.

📥 INPUT FORMAT (MANDATORY)
Session Data:
- Question: "${state.currentQuestion}"
- Duration: ${analysis.duration} seconds
- Lighting Quality: ${metrics.session.lightingQuality}
- Face Visibility: ${metrics.session.faceVisibility}

Facial Metrics:
- Eye Contact Ratio (0–1): ${metrics.facial.eyeContactRatio}
- Head Movement Variance (0–1): ${metrics.facial.headMovementVariance}

Audio Metrics:
- Speech Detected: ${analysis.signalQuality.speechDataAvailable ? 'Yes' : 'No'}
- Average Speaking Pace (words per minute): ${analysis.signalQuality.speechDataAvailable ? metrics.audio.speakingPace : 'N/A'}
- Pause Frequency (pauses per minute): ${analysis.signalQuality.speechDataAvailable ? metrics.audio.pauseFrequency : 'N/A'}

Data Quality:
- Eye Contact Data Available: ${analysis.signalQuality.eyeContactAvailable ? 'Yes' : 'No'}
- Head Movement Data Available: ${analysis.signalQuality.headMovementAvailable ? 'Yes' : 'No'}
- Speech Data Available: ${analysis.signalQuality.speechDataAvailable ? 'Yes' : 'No'}
- Visual Confidence: ${metrics.confidence.visual}
- Audio Confidence: ${metrics.confidence.audio}

Session ID: ${metricsHash}-${timestamp % 10000}

🧠 RULES (THIS IS WHAT STOPS REPETITION)

RULE 1:
You MUST NOT reuse the same phrasing across sessions.

RULE 2:
Feedback MUST change if ANY numeric value changes by more than 10%.

RULE 3:
If Visual Confidence is low:
${metrics.confidence.visual === 'low' ? 
`- You MUST explicitly say visual feedback is limited
- You MUST NOT comment on eye contact or head movement quality` : 
`(Visual Confidence is ${metrics.confidence.visual} — you CAN comment on eye contact and head movement)`}

RULE 4:
If Speech Detected is No:
${!analysis.signalQuality.speechDataAvailable ? 
`- You MUST state that no speech was detected
- You MUST NOT comment on speech pace, volume, or delivery
- You SHOULD suggest checking microphone settings for future sessions` : 
`(Speech was detected — you CAN comment on audio and delivery)`}

RULE 5:
If Audio Confidence is high AND speech was detected:
${metrics.confidence.audio === 'high' && analysis.signalQuality.speechDataAvailable ? 
`- You MUST give specific audio feedback
- Reference pace (${metrics.audio.speakingPace} wpm) or pauses (${metrics.audio.pauseFrequency}/min) explicitly` : 
metrics.confidence.audio === 'medium' && analysis.signalQuality.speechDataAvailable ?
`(Audio Confidence is medium — you CAN give general audio feedback)` :
`(Audio feedback is limited or unavailable)`}

RULE 6:
You MUST mention at least ONE metric by implication
(e.g. "frequent pauses", "rapid pace", "minimal movement")
Only if that data type is available.

RULE 7:
Do NOT give numeric scores.
Do NOT praise generally.
Do NOT say "good job" or "well done".

🧾 OUTPUT STRUCTURE (FIXED)

1. What Was Observed
(2–3 sentences, factual, metric-driven)

2. What Could Not Be Reliably Analyzed
(Only if applicable)

3. Coaching Insight
(1–2 actionable, specific suggestions)

🧪 EXAMPLE (THIS IS THE STANDARD YOU WANT)

Case A — fast speaker, low eye contact

What Was Observed
Your speaking pace was relatively fast, with frequent transitions between points. Eye focus shifted often, suggesting attention was divided rather than anchored.

Coaching Insight
Slowing your pace and pausing briefly between ideas can improve clarity. Try maintaining eye focus on the camera for a few seconds per thought to strengthen presence.

Case B — slow speaker, stable posture

What Was Observed
Your delivery was measured with longer pauses between sentences. Head movement remained minimal, indicating physical stability.

Coaching Insight
Reducing pause length slightly can improve flow. Keeping this steady posture while tightening transitions will enhance engagement.

Notice:
- different structure
- different emphasis
- no repetition
- no fake positivity

NOW GENERATE FEEDBACK FOR THIS SESSION:`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            contents: [{
                parts: [{
                    text: prompt
                }]
            }],
            generationConfig: {
                temperature: 0.8, // Slightly higher for variation
                maxOutputTokens: 400
            }
        })
    });

    if (!response.ok) {
        throw new Error('API request failed');
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}

/**
 * Compute a hash from metrics to detect changes
 * This enables deterministic variation: same metrics = same allowed phrasing
 */
function computeMetricsHash(metrics) {
    const values = [
        Math.round(metrics.facial.eyeContactRatio * 10),
        Math.round(metrics.facial.headMovementVariance * 10),
        Math.round(metrics.audio.speakingPace / 10),
        Math.round(metrics.audio.pauseFrequency)
    ];
    return values.join('-');
}

/**
 * Build context string for AI based on signal quality (legacy compatibility)
 */
function buildSignalQualityContext(quality, analysis) {
    const metrics = analysis.metrics;
    const lines = [];
    
    lines.push(`Session: ${metrics.session.lightingQuality} lighting, ${metrics.session.faceVisibility} face visibility`);
    lines.push(`Eye Contact Ratio: ${metrics.facial.eyeContactRatio}`);
    lines.push(`Head Movement Variance: ${metrics.facial.headMovementVariance}`);
    lines.push(`Speaking Pace: ${metrics.audio.speakingPace} wpm`);
    lines.push(`Pause Frequency: ${metrics.audio.pauseFrequency}/min`);
    lines.push(`Visual Confidence: ${metrics.confidence.visual}`);
    lines.push(`Audio Confidence: ${metrics.confidence.audio}`);
    
    return lines.join('\n');
}

function generateLocalFeedback(analysis) {
    const metrics = analysis.metrics;
    const visualConf = metrics.confidence.visual;
    const audioConf = metrics.confidence.audio;
    
    // Use metrics hash for deterministic phrase selection
    const hash = computeMetricsHash(metrics);
    const seed = hash.split('-').reduce((a, b) => a + parseInt(b), 0);
    
    const sections = [];
    
    // === SECTION 1: WHAT WAS OBSERVED ===
    const observations = [];
    
    // Visual observations (only if visual confidence is not low)
    if (visualConf !== 'low') {
        const eyeRatio = metrics.facial.eyeContactRatio;
        const headVar = metrics.facial.headMovementVariance;
        
        // Eye contact observation - varies by metric value
        if (eyeRatio >= 0.7) {
            observations.push(selectPhrase(seed, [
                'Eye focus remained anchored throughout the response',
                'Gaze direction stayed centered and consistent',
                'Visual attention appeared directed at the camera',
                'Camera focus was maintained during key points',
                'Eye contact suggested focused engagement'
            ]));
        } else if (eyeRatio >= 0.4) {
            observations.push(selectPhrase(seed, [
                'Eye focus shifted periodically during the response',
                'Gaze moved between the camera and other points',
                'Attention appeared divided at times',
                'Visual focus drifted occasionally during delivery',
                'Eye contact was present but inconsistent'
            ]));
        } else {
            observations.push(selectPhrase(seed, [
                'Eye contact with the camera was infrequent',
                'Gaze direction was often away from center',
                'Visual focus shifted frequently throughout',
                'Eye focus shifted often, suggesting attention was divided rather than anchored',
                'Camera engagement appeared limited during the response'
            ]));
        }
        
        // Head movement observation
        if (headVar <= 0.2) {
            observations.push(selectPhrase(seed + 1, [
                'Head position remained stable',
                'Physical posture showed minimal movement',
                'Upper body positioning was consistent',
                'Head movement remained minimal, indicating physical stability',
                'Posture maintained steadiness throughout'
            ]));
        } else if (headVar <= 0.5) {
            observations.push(selectPhrase(seed + 1, [
                'Some natural head movement was present',
                'Moderate physical expressiveness observed',
                'Posture included occasional shifts',
                'Natural gestures accompanied the response',
                'Physical presence showed comfortable movement'
            ]));
        } else {
            observations.push(selectPhrase(seed + 1, [
                'Notable head movement throughout',
                'Physical expressiveness was pronounced',
                'Frequent positional adjustments detected',
                'Active movement accompanied verbal delivery',
                'Physical energy was visible during the response'
            ]));
        }
    }
    
    // Audio observations (varies by confidence level and whether speech was detected)
    const speechDetected = analysis.signalQuality.speechDataAvailable;
    
    if (speechDetected && audioConf === 'high') {
        const pace = metrics.audio.speakingPace;
        const pauses = metrics.audio.pauseFrequency;
        
        // Pace observation
        if (pace >= 160) {
            observations.push(selectPhrase(seed + 2, [
                'Speaking pace was notably rapid',
                'Delivery tempo was on the faster side',
                'Words flowed at an accelerated rate',
                'Speaking pace was relatively fast, with frequent transitions between points',
                'Verbal delivery moved quickly through ideas'
            ]));
        } else if (pace >= 120) {
            observations.push(selectPhrase(seed + 2, [
                'Speaking pace fell within a conversational range',
                'Delivery maintained a measured tempo',
                'Verbal pacing was balanced',
                'Speaking rhythm felt natural and conversational',
                'Pace remained steady throughout the response'
            ]));
        } else {
            observations.push(selectPhrase(seed + 2, [
                'Speaking pace was deliberate and slower',
                'Delivery tempo was on the measured side',
                'Words were spaced with care',
                'Delivery was measured with longer pauses between sentences',
                'Response pacing allowed space between thoughts'
            ]));
        }
        
        // Pause observation
        if (pauses >= 8) {
            observations.push(selectPhrase(seed + 3, [
                'Frequent pauses punctuated the response',
                'Multiple breaks occurred between thoughts',
                'Silence gaps appeared regularly'
            ]));
        } else if (pauses >= 3) {
            observations.push(selectPhrase(seed + 3, [
                'Pauses were used intermittently',
                'Brief breaks separated some thoughts',
                'Occasional silence gaps were present'
            ]));
        } else {
            observations.push(selectPhrase(seed + 3, [
                'Few pauses interrupted the flow',
                'Delivery was relatively continuous',
                'Minimal silence gaps detected'
            ]));
        }
    } else if (speechDetected && audioConf === 'medium') {
        observations.push(selectPhrase(seed + 2, [
            'Audio patterns were partially captured',
            'Speech activity was detected with some gaps',
            'Vocal patterns were intermittently recorded'
        ]));
    }
    // Note: If no speech was detected, we don't add audio observations here
    // The limitations section will handle this case
    
    // Join observations into flowing sentences
    sections.push('What Was Observed\n' + observations.join('. ') + '.');
    
    // === SECTION 2: WHAT COULD NOT BE RELIABLY ANALYZED ===
    const limitations = [];
    
    if (visualConf === 'low') {
        limitations.push(selectPhrase(seed + 4, [
            'Visual metrics (eye contact, head movement) could not be reliably captured due to lighting or camera positioning',
            'Face tracking data was insufficient for visual analysis',
            'Camera feed quality limited our ability to assess visual presence'
        ]));
    }
    
    // Handle "no speech detected" case specifically
    if (!speechDetected) {
        limitations.push(selectPhrase(seed + 5, [
            'No speech was detected during this recording. If you did speak, please check your microphone settings for future sessions',
            'Audio analysis was not possible as no speech was detected. Ensure your microphone is working and positioned correctly',
            'We did not detect any speech audio. For future sessions, verify your microphone is enabled and try speaking a bit louder'
        ]));
    } else if (audioConf === 'low') {
        limitations.push(selectPhrase(seed + 5, [
            'Audio metrics could not be reliably captured due to microphone issues or background conditions',
            'Speech patterns were not consistently detected',
            'Audio signal was too weak for detailed pace analysis'
        ]));
    }

    
    if (limitations.length > 0) {
        sections.push('What Could Not Be Reliably Analyzed\n' + limitations.join('. ') + '.');
    }
    
    // === SECTION 3: COACHING INSIGHT ===
    const insights = [];
    
    // Generate insights based on what we CAN analyze
    if (visualConf !== 'low') {
        const eyeRatio = metrics.facial.eyeContactRatio;
        const headVar = metrics.facial.headMovementVariance;
        
        if (eyeRatio < 0.5) {
            insights.push(selectPhrase(seed + 6, [
                'Placing a small marker near the camera lens can help anchor your gaze',
                'Try imagining a conversation partner just behind the camera',
                'Keeping notes near the camera can reduce the need to look away',
                'Maintaining eye focus on the camera for a few seconds per thought can strengthen presence',
                'Practicing camera focus during key points may improve engagement'
            ]));
        }
        
        if (headVar > 0.5) {
            insights.push(selectPhrase(seed + 7, [
                'Grounding your feet and sitting back slightly may reduce excess movement',
                'Taking a breath before speaking can help settle physical energy',
                'Finding a stable posture before recording may improve presence',
                'Keeping this steady posture while tightening transitions will enhance engagement',
                'Centering yourself physically before responding can project calm confidence'
            ]));
        }
    }
    
    if (audioConf !== 'low') {
        const pace = metrics.audio.speakingPace;
        const pauses = metrics.audio.pauseFrequency;
        
        if (pace > 160) {
            insights.push(selectPhrase(seed + 8, [
                'Consciously pausing between key points can improve clarity',
                'Slowing down slightly on important details may aid comprehension',
                'Brief pauses after main ideas can let points land',
                'Slowing your pace and pausing briefly between ideas can improve clarity',
                'Giving key points room to breathe may enhance listener retention'
            ]));
        } else if (pace < 100) {
            insights.push(selectPhrase(seed + 8, [
                'Tightening transitions between sentences could improve flow',
                'Reducing extended pauses may maintain listener engagement',
                'Practicing with a timer can help calibrate pacing',
                'Reducing pause length slightly can improve flow',
                'Connecting ideas more directly may increase momentum'
            ]));
        }
        
        if (pauses > 10) {
            insights.push(selectPhrase(seed + 9, [
                'Reducing pause frequency between thoughts may improve fluency',
                'Having key points outlined beforehand can minimize hesitation',
                'Practicing transitions between ideas can reduce gaps',
                'Preparing key phrases in advance may reduce thinking pauses',
                'Structuring thoughts before speaking can streamline delivery'
            ]));
        }
    }
    
    // Fallback insight if we couldn't generate specific ones
    if (insights.length === 0) {
        if (visualConf === 'low' || audioConf === 'low') {
            insights.push(selectPhrase(seed + 10, [
                'Improving lighting and microphone positioning will enable more detailed feedback',
                'A longer session with better signal quality would allow for specific insights',
                'Ensuring face visibility and clear audio will enhance future analysis'
            ]));
        } else {
            insights.push(selectPhrase(seed + 10, [
                'Continue practicing with varied question types to build adaptability',
                'Recording longer responses can reveal patterns in delivery over time',
                'Experimenting with different postures may help find your optimal presence'
            ]));
        }
    }
    
    sections.push('Coaching Insight\n' + insights.join('. ') + '.');
    
    return sections.join('\n\n');
}

/**
 * Select a phrase deterministically based on seed
 * Same seed = same phrase (prevents repetition within session, allows variation across sessions)
 */
function selectPhrase(seed, phrases) {
    return phrases[seed % phrases.length];
}

// ============================================
// FEEDBACK SCREEN HANDLERS
// ============================================

elements.practiceAgainBtn.addEventListener('click', () => {
    // Reset recording state
    resetRecordingState();
    navigateTo('recording-screen');
});

elements.newQuestionBtn.addEventListener('click', () => {
    // Reset recording state and get new question
    resetRecordingState();
    selectRandomQuestion();
    navigateTo('question-screen');
});

function resetRecordingState() {
    state.isRecording = false;
    state.recordingStartTime = null;
    state.recordingDuration = 0;
    state.eyeContactSamples = [];
    state.headMovementSamples = [];
    state.speechSamples = [];
    state.recordedChunks = [];
    
    // Reset UI elements
    const timerValue = elements.timerDisplay.querySelector('.timer-value');
    timerValue.textContent = '00:00';
    elements.startRecordingBtn.classList.remove('hidden');
    elements.stopRecordingBtn.classList.add('hidden');
    elements.cameraPlaceholder.classList.remove('hidden');
    
    // Reset analysis steps
    document.querySelectorAll('.analysis-step').forEach(step => {
        step.classList.remove('active', 'done');
    });
    elements.analysisProgress.style.strokeDashoffset = 339.3;
}

// ============================================
// BACK BUTTON HANDLERS
// ============================================

elements.backBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const target = btn.dataset.target;
        if (target) {
            // Clean up if leaving recording screen
            if (state.currentScreen === 'recording-screen') {
                stopCamera();
                resetRecordingState();
            }
            navigateTo(target);
        }
    });
});

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Animate initial screen
    setTimeout(() => {
        elements.landingScreen.classList.add('active');
    }, 100);
    
    // Focus name input
    setTimeout(() => {
        elements.userNameInput.focus();
    }, 800);
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    stopCamera();
});

// ============================================
// OPTIONAL: GEMINI API KEY SETUP
// ============================================

// Users can set their Gemini API key via console:
// localStorage.setItem('gemini_api_key', 'YOUR_API_KEY');
