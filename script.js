// Global constant declarations
const VOCAB_DATA_DIRECTORY = './data/';
const VOCAB_DATA_FILENAME = 'vocab_data';
const IMAGE_DIRECTORY = './media/images/english/';
const AUDIO_DIRECTORY = './media/audio/english/';
const SFX_DIRECTORY = './media/audio/sound_effects/';

const GAME_STATES = {
    MENU: 'menu',
    QUESTION: 'question',
    MATCHED: 'matched',
    END: 'end',
    REVIEW: 'review',
    PAUSED: 'paused',
}

const DEFAULT_SETTINGS = {
    duplicateQuestions: false,
    defaultQuestionCount: 20,
    minTimePerQuestion: 5,
    maxTimePerQuestion: 25,
    defaultTimePerQuestion: 15,
    timeWarningThreshold: 3,
}

const SFX_FILENAMES = {
    buttonClick: 'button_click',
    checkboxClick: 'checkbox_click',
    correct: 'correct',
    incorrect: 'incorrect',
    navButtonClick: 'nav_button_click',
    outOfTime: 'out_of_time',
    quizCompleted: 'quiz_completed',
    quizFailed: 'quiz_failed',
    spinnerClick: 'spinner_click',
    timeWarning: 'time_warning',
}

const END_GAME_MESSAGES = {
    quizCompleted: '全問クリアです！おめでとうぎざいます！',
    outOfTime: '時間切れです！再挑戦してみましょう！',
}

const COLORS = {
    redTransparent: 'rgba(255, 0, 0, 0.3)',
    greenTransparent: 'rgba(0, 255, 0, 0.3)',
    yellowTransparent: 'rgba(255, 255, 0, 0.3)',
}

// SFX map
const activeSFX = new Map();

// Speech Recognition object
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

const recognition = new SpeechRecognition();

recognition.lang = 'en-US';
recognition.continuous = true;
recognition.interimResults = true;
recognition.maxAlternatives = 1;

// Global object declarations
const vocabData = {
    all: [],
    get maxQuestionCount() { return this.all.length }, 
}

const quiz = {};
const timer = {};

const imageCache = {};

const fireworks = {
    minStars: 50,
    maxStars: 300,
    maxHueVariation: 50,
    maxLightnessVariation: 20,
    minPctDiameter: 30,
    maxPctDiameter: 100,
    maxDuration: 3,
    minDelay: 200,
    maxDelay: 2000,
    minCorrectRatio: 0.25,
    animationFrameID: null,
}

const elements = {
    interfaces: {
        menu: document.querySelector('#menu-interface'),
        quiz: document.querySelector('#quiz-interface'),
    },
    menu: {
        settings: {
            form: document.querySelector('#settings-form'),
            questionCount: document.querySelector('#question-count-setting'),
            useAllQuestions: document.querySelector('#use-all-questions-setting'),
            useTimer: document.querySelector('#use-timer-setting'),
            quizTimeAllowance: document.querySelector('#time-allowance-slider'),
            timeAllowanceReading: document.querySelector('#time-allowance-reading'),
        },
    },
    gameplayWidget: {
        widget: document.querySelector('#gameplay-widget'),
        sections: {
            top: document.querySelector('.gameplay-widget-section--top'),
            middle: document.querySelector('.gameplay-widget-section--middle'),
            bottom: document.querySelector('.gameplay-widget-section--bottom'),
        }
    },
    navButtons: {
        home: document.querySelector('#home-button'),
        pause: document.querySelector('#pause-button'),
    },
    statusBars: {
        countdownTimer: {
            bar: document.querySelector('#countdown-timer-bar'),
            fill: document.querySelector('#countdown-timer-bar .status-bar-fill'),
        },
        quizProgress: {
            bar: document.querySelector('#quiz-progress-bar'),
            fill: document.querySelector('#quiz-progress-bar .status-bar-fill'),
        },
    },
    countdownTimer: document.querySelector('.countdown-timer'),
    vocabImage: {
        container: document.querySelector('.image-container'),
        image: document.querySelector('#main-image'),
        attribution: document.querySelector('#image-attribution'),
    },
    vocabDisplay: {
        container: document.querySelector('.vocab-display'),
        transcript: {
            text: document.querySelector('#transcript-text'),
            display: document.querySelector('#transcript-display'),
            restartRecognitionButton: document.querySelector('#restart-recognition'),
        },
        eng: document.querySelector('#vocab-eng'),
        jp: document.querySelector('#vocab-jp'),
    },
    endGameUI: {
        container: document.querySelector('.end-game-container'),
        finalScore: document.querySelectorAll('.score')[0],
        questionCount: document.querySelectorAll('.question-count')[0],
        message: document.querySelector('#completion-message'),
        reviewButton: document.querySelector('#review-quiz-button'),
        fireworksBackground: document.querySelector('.fireworks-background'),
    },
    gameplayControls: {
        container: document.querySelector('.gameplay-controls'),
        prevReview: document.querySelector('#prev-review-button'),
        playAudio: document.querySelector('#play-audio-button'),
        skip: document.querySelector('#skip-button'),
        nextReview: document.querySelector('#next-review-button'),
    },
    scoreDisplay: {
        container: document.querySelector('.score-display'),
        score: document.querySelectorAll('.score')[1],
        questionCount: document.querySelectorAll('.question-count')[1],
    },
    dialogs: {
        pause: document.querySelector('#pause-dialog'),
    },
    vocabAudio: document.querySelector('#vocab-audio'),
}

elements.menu.settings.numberInputs = elements.menu.settings.form.querySelectorAll('input[type="number"]');
elements.menu.settings.numberSpinButtons = elements.menu.settings.form.querySelectorAll('.number-spin-button');

// Function delcarations
async function init() {
    try {
        vocabData.all = await loadVocabJSON(VOCAB_DATA_FILENAME, VOCAB_DATA_DIRECTORY);
    } catch (error) {
        console.error('Error fetching JSON:', error);
        alert('データの読み込みに失敗しました。');
        return;
    }

    addButtonClickEffects();
    resetGame();
}

async function loadVocabJSON(filename, directory) {
    const path = `${directory}${filename}.json`
    const response = await fetch(path);

    if (!response.ok) {
        throw new Error(`Failed to load ${path}: ${response.statusText}`);
    }

    return await response.json();
}


function addButtonClickEffects() {
    function addMultipleSFX(selector, event, SFX) {
        const elementGroup = document.querySelectorAll(selector);
        elementGroup.forEach(element => {
            element.addEventListener(event, () => {
                playSFXSafe(SFX_FILENAMES[SFX]);
            });
        });
    }

    addMultipleSFX('.menu-button, #review-quiz-button', 'click', 'buttonClick');
    addMultipleSFX('input[type="checkbox"]', 'click', 'checkboxClick');
    addMultipleSFX('.number-spin-button', 'click', 'spinnerClick');
    addMultipleSFX('.nav-button', 'click', 'navButtonClick');
}

async function playSFXSafe(sfxName) {
    const source = `${SFX_DIRECTORY}${sfxName}.mp3`;
    try {
        await playSoundEffect(sfxName, source);
    } catch (error) {
        console.warn('Failed to play sound effect: ', error);
    }
}

function playSoundEffect(id, source) {
    return new Promise((resolve, reject) => {
        const sfx = new Audio(source);
        activeSFX.set(id, sfx);
        const removeFromQueue = () => activeSFX.delete(id);

        sfx.onended = () => {
            removeFromQueue();
            resolve();
        }

        sfx.onerror = () => {
            removeFromQueue();
            reject(new Error(`Audio error on ${source}`));
        }

        sfx.play().catch(error => {
            removeFromQueue();
            reject(error);
        });
    });
}

function resetGame() {
    resetObjectValues();
    resetSettingsToDefault();
    resetDOMElements();
}

function resetObjectValues() {
    Object.assign(quiz, {
        state: {
            current: GAME_STATES.MENU,
            previous: null,
        },
        settings: {
            useTimer: false,
            timePerQuestion: 0,
            limitAttempts: false,
            attemptsPerQuestion: 0,
        },
        questions: {
            list: [],
            currentIndex: 0,
            get count() { return this.list.length },
        },
        currentQuestion: {},
        stats: {
            score: 0,
        }
    });

    Object.assign(timer, {
        timerRunning: false,
        timeRemaining: 0,
        startTime: null,
        pausedTime: null,
        animationFrameID: null,
    });
}

function resetSettingsToDefault() {
    elements.menu.settings.questionCount.max = vocabData.maxQuestionCount;
    elements.menu.settings.questionCount.value = Math.min(vocabData.maxQuestionCount, DEFAULT_SETTINGS.defaultQuestionCount);
    elements.menu.settings.questionCount.dispatchEvent(new Event('input', { bubbles : true }));

    elements.menu.settings.useAllQuestions.checked = false;

    elements.menu.settings.useTimer.checked = true;
    elements.menu.settings.useTimer.dispatchEvent(new Event('change'));

    const timeAllowanceSlider = elements.menu.settings.quizTimeAllowance;
    const max = parseInt(timeAllowanceSlider.max);
    const min = parseInt(timeAllowanceSlider.min);
    timeAllowanceSlider.value = 0.5 * (max - min) + min;
}

function resetDOMElements() {
    elements.navButtons.pause.classList.remove('hidden');

    elements.statusBars.countdownTimer.bar.parentElement.classList.add('hidden');
    elements.statusBars.countdownTimer.fill.removeAttribute('style');

    elements.countdownTimer.textContent = '';
    elements.countdownTimer.classList.add('hidden');

    elements.vocabImage.image.removeAttribute('src');
    elements.vocabImage.image.removeAttribute('alt');
    elements.vocabImage.attribution.innerHTML = '';

    elements.vocabDisplay.transcript.display.classList.remove('hidden');
    elements.vocabDisplay.eng.textContent = '';
    elements.vocabDisplay.jp.innerHTML = '';

    elements.endGameUI.finalScore.textContent = '0';
    elements.endGameUI.questionCount.textContent = '';
    elements.endGameUI.message.textContent = '';
    elements.endGameUI.reviewButton.disabled = true;
    elements.endGameUI.fireworksBackground.innerHTML = '';

    elements.statusBars.quizProgress.fill.style.width = '0%';

    elements.scoreDisplay.score.textContent = '0';
    elements.scoreDisplay.questionCount.textContent = '';

    elements.interfaces.menu.classList.remove('hidden');
    elements.interfaces.quiz.classList.add('hidden');

    elements.dialogs.pause.close();
    
    elements.vocabAudio.removeAttribute('src');
    elements.vocabAudio.load();

    cancelAnimationFrame(fireworks.animationFrameID);
    fireworks.animationFrameID = null;


    updateTranscriptDisplay();
    toggleGameplayButtons();
    toggleCompletionScreen();
}

function updateTranscriptDisplay(transcript) {
    const transcriptText = elements.vocabDisplay.transcript.text;
    const transcriptDisplay = elements.vocabDisplay.transcript.display;

    transcriptText.textContent = transcript;

    if (transcript) {
        if (quiz.state.current === GAME_STATES.MATCHED) {
            transcriptDisplay.classList.remove('transcript-display--no-match');
            transcriptDisplay.classList.add('transcript-display--found-match');
        } else {
            transcriptDisplay.classList.add('transcript-display--no-match');
        }
    } else {
        elements.vocabDisplay.transcript.display.classList.remove('transcript-display--found-match');
        elements.vocabDisplay.transcript.display.classList.remove('transcript-display--no-match');
    }
}

function toggleGameplayButtons() {
    function toggleButton(button, visibleStates) {
        const wrapper = button?.closest('.control-button-wrapper');
        const isVisible = visibleStates.includes(quiz.state.current);

        wrapper?.classList.toggle('hidden', !isVisible);
        button.disabled = !isVisible || (isVisible && quiz.state.current === GAME_STATES.ANSWER);
    }

    toggleButton(elements.gameplayControls.playAudio, [GAME_STATES.QUESTION, GAME_STATES.REVIEW]);
    toggleButton(elements.gameplayControls.skip, [GAME_STATES.QUESTION]);
    toggleButton(elements.gameplayControls.nextReview, [GAME_STATES.REVIEW]);
    toggleButton(elements.gameplayControls.prevReview, [GAME_STATES.REVIEW]);    
}

function toggleCompletionScreen() {
    const quizEnded = quiz.state.current === GAME_STATES.END
    
    setButtonDisabledState(elements.gameplayControls.playAudio, quizEnded);
    setButtonDisabledState(elements.gameplayControls.skip, quizEnded);

    elements.endGameUI.container.classList.toggle('invisible', !quizEnded);
    elements.countdownTimer.classList.toggle('invisible', quizEnded);
    elements.vocabImage.container.classList.toggle('invisible', quizEnded);
    elements.vocabDisplay.container.classList.toggle('invisible', quizEnded);
}

function setButtonDisabledState(buttonElement, disable) {
    buttonElement.disabled = disable;
    buttonElement.style.pointerEvents = disable ? 'none' : 'auto';
    buttonElement.classList.toggle('control-button--disabled', disable);
}

function newQuiz() {
    const questionCount = updateQuizSettings();
    if (questionCount === null) return;

    quiz.questions.list = generateQuestionList(vocabData.all, questionCount, DEFAULT_SETTINGS.duplicateQuestions);

    quiz.state.current = GAME_STATES.QUESTION;

    prepareQuizUI();
    renderQuestion(quiz.questions.currentIndex);
}

function updateQuizSettings() {
    const questionCount = verifyIntegerInput(elements.menu.settings.questionCount.value, 'Question Count', 1, vocabData.maxQuestionCount);

    if (questionCount === null) return null;

    quiz.settings.useTimer = elements.menu.settings.useTimer.checked;

    if (quiz.settings.useTimer) {
        const minPermissable = DEFAULT_SETTINGS.minTimePerQuestion * questionCount;
        const maxPermissable = DEFAULT_SETTINGS.maxTimePerQuestion * questionCount;
        const timeAllowance = verifyIntegerInput(elements.menu.settings.quizTimeAllowance.value, 'Time Per Question', minPermissable, maxPermissable);

        if (timeAllowance === null) return null;

        quiz.settings.quizTimeAllowance = timeAllowance * 1000;
    }

    return questionCount;
}

function verifyIntegerInput(inputValue, inputName, minValue, maxValue = Infinity) {
    const parsedValue = parseInt(inputValue, 10);

    if (isNaN(parsedValue) || parsedValue < minValue || parsedValue > maxValue) {
        console.error(`Invalid value for ${inputName}: ${inputValue}`);
        return null;
    }

    return parsedValue;
}

function generateQuestionList(data, sampleSize, shuffleWithReplacement) {
    if (!shuffleWithReplacement && data.length < sampleSize) {
        console.error('Not enough elements to sample.');
        return [];
    }
    
    let questions;

    if (shuffleWithReplacement) {
        questions = Array.from({ length: sampleSize}, () => Math.floor(Math.random() * data.length));
    } else {
        questions = data.map((_, i) => i);

        for (let i = questions.length - 1; i >= 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [questions[i], questions[j]] = [questions[j], questions[i]];
        }
        questions = questions.slice(0, sampleSize);
    }

    return questions;
}

function prepareQuizUI() {    
    elements.statusBars.countdownTimer.bar.parentElement.classList.toggle('hidden', !quiz.settings.useTimer);

    elements.countdownTimer.classList.toggle('hidden', !quiz.settings.useTimer);

    elements.scoreDisplay.questionCount.textContent = quiz.questions.count;

    elements.interfaces.menu.classList.add('hidden');
    elements.interfaces.quiz.classList.remove('hidden');
}

function renderQuestion() {
    getVocabData(quiz.questions.list[quiz.questions.currentIndex]);
    displayVocab();
    setVocabAudio();
    setVocabImage();
    toggleGameplayButtons();
    preloadImages(quiz.questions.currentIndex + 1);
    playAudio();

    if (quiz.state.current === GAME_STATES.QUESTION) {
        restartRecognition();
        startTimer();
    } else if (quiz.state.current === GAME_STATES.REVIEW) {
        updateReviewButtons();
    }
}

async function getVocabData(index) {
    const vocab = vocabData.all[index];

    if (!vocab || !vocab.eng || !vocab.jp) {
        console.error(`Missing vocab data at index ${index}.`);
        return;
    }

    quiz.currentQuestion = {
        ...vocab,
        attemptsRemaining: quiz.settings.attemptsPerQuestion,
    }
}

function displayVocab() {
    elements.vocabDisplay.eng.textContent = quiz.currentQuestion.eng;
    elements.vocabDisplay.jp.innerHTML = quiz.currentQuestion.jpFormatted;

    const hasFurigana = quiz.currentQuestion.hasFurigana;
    elements.vocabDisplay.jp.classList.toggle('jp-vocab--kana', !hasFurigana);
    elements.vocabDisplay.jp.classList.toggle('jp-vocab--furigana', hasFurigana);
    
    updateTranscriptDisplay('')
}

function setVocabAudio() {
    const audioFilename = quiz.currentQuestion?.audio;

    if (audioFilename) {
        elements.vocabAudio.src = `${AUDIO_DIRECTORY}${audioFilename}`;
    } else {
        elements.vocabAudio.removeAttribute('src');
    }

    elements.vocabAudio.load();
}

async function setVocabImage() {
    const img = await loadImage(quiz.currentQuestion?.image);

    if (img) {
        elements.vocabImage.image.src = img.src;
        elements.vocabImage.attribution.innerHTML = quiz.currentQuestion?.attr || '';
        
        const attributionLinks = elements.vocabImage.attribution.querySelectorAll('a');
        attributionLinks.forEach(link => {
            link.setAttribute('target', '_blank');
            link.setAttribute('rel', 'noopener noreferrer');
        });
    } else {
        elements.vocabImage.image.removeAttribute('src');
        elements.vocabImage.attribution.innerHTML = '';
    }

    elements.vocabImage.image.alt = quiz.currentQuestion?.jp || '';
}

async function loadImage(filename) {
    if (!filename) return null;

    if (filename in imageCache) {
        return imageCache[filename];
    }

    return new Promise(resolve => {
        const img = new Image();
        img.src = `${IMAGE_DIRECTORY}${filename}`;

        img.onload = () => {
            imageCache[filename] = img;
            resolve(img);
        };

        img.onerror = () => {
            console.warn(`Failed to load image: ${filename}`);
            resolve(null);
        };
    });
}

function preloadImages(startIndex, count=3) {
    const promises = [];
    const maxIndex = Math.min(startIndex + count, quiz.questions.list.length);

    for (let i = startIndex; i < maxIndex; i++) {
        const questionNumber = quiz.questions.list[i];
        const filename = vocabData.all[questionNumber].image;
        
        if (!filename || filename in imageCache) continue;

        promises.push(loadImage(filename));
    }

    return Promise.all(promises);
}

async function playAudio() {
    const audio = elements.vocabAudio;

    if (!audio.src) {
        console.warn('No audio available.');
        return;
    }

    if (!audio.paused && !audio.ended) return;

    try {
        audio.load(); // Fixes cutoff audio playback on Safari
        await audio.play();
    } catch (error) {
        console.warn('Audio playback failed:', error);
        alert('音声の再生に失敗しました。');
    }
}

function restartRecognition() {
    recognition.stop();

    setTimeout(() => {
        try {
            recognition.start();
            console.log('Recognition reset.');
        } catch {
            console.log('Speech Recognition already running.');
        }
    }, 100);
}

function startTimer() {
    if (timer.timerRunning || !quiz.settings.useTimer) return;
    timer.timerRunning = true;

    const timeLimit = quiz.settings.quizTimeAllowance;

    if (!timer.timeRemaining) {
        timer.timeRemaining = timeLimit;
    }

    const now = performance.now();
    timer.startTime = now - (timer.pausedTime || 0);

    function animateCountdown(now) {
        const elapsed = now - timer.startTime;
        timer.timeRemaining = Math.max(timeLimit - elapsed, 0);

        updateTimerDisplay();

        if (timer.timeRemaining <= DEFAULT_SETTINGS.timeWarningThreshold * 1000 && (!activeSFX.has(SFX_FILENAMES.timeWarning) || activeSFX.get(SFX_FILENAMES.timeWarning).paused)) {
            playSFXSafe(SFX_FILENAMES.timeWarning);
        }
        
        if (timer.timeRemaining > 0) {
            timer.animationFrameID = requestAnimationFrame(animateCountdown);
        } else {
            outOfTime();
        }
    }

    timer.animationFrameID = requestAnimationFrame(animateCountdown);
}

function updateTimerDisplay() {
    elements.countdownTimer.textContent = formatTime(Math.ceil(timer.timeRemaining / 1000));

    updateStatusBar(
        elements.statusBars.countdownTimer.fill,
        timer.timeRemaining,
        quiz.settings.quizTimeAllowance
    );

    const countdownTimerBar = elements.statusBars.countdownTimer.bar;

    if (timer.timeRemaining <= DEFAULT_SETTINGS.timeWarningThreshold * 1000 && !countdownTimerBar.classList.contains('pulsing')) {
        resetClass(elements.statusBars.countdownTimer.bar, 'pulsing');
    }
}

function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return [hours ? hours : null, minutes, secs]
        .filter(unit => unit !== null)
        .map(unit => String(unit).padStart(2, '0'))
        .join(':');
}

function updateStatusBar(DOMElement, fraction, total) {
    DOMElement.style.width = `${fraction / total * 100}%`;
    colorStatusBar(DOMElement, fraction, total)
}

function colorStatusBar(DOMElement, fraction, total) {
    const hue = fraction / total * 120;
    DOMElement.style.background = `linear-gradient(hsl(${hue}, 100%, 50%), hsl(${hue}, 100%, 40%))`;
}

function resetClass(element, className) {
    element.classList.remove(className);
    void element.offsetWidth;
    element.classList.add(className);
}

async function outOfTime() {
    elements.statusBars.countdownTimer.fill.style.width = '0%';

    pauseTimer();
    addFlashEffect(
        elements.statusBars.countdownTimer.bar,
        COLORS.redTransparent,
        'background'
    );
    stopAllSFX();
    await playSFXSafe(SFX_FILENAMES.outOfTime);
    endQuiz(false);
}

function pauseTimer() {
    if (!timer.timerRunning || !quiz.settings.useTimer) return;
    
    if (timer.animationFrameID) {
        cancelAnimationFrame(timer.animationFrameID);
        timer.animationFrameID = null;
    }

    timer.pausedTime = performance.now() - timer.startTime;
    timer.timerRunning = false;

    elements.statusBars.countdownTimer.bar.classList.remove('pulsing');
}

function addFlashEffect(element, color, property) {
    element.style.setProperty('--flash-color', color);
    resetClass(element, `flash-${property}`);
}

function stopAllSFX() {
    activeSFX.forEach((value, key) => stopSFX(key));
}

function stopSFX(id) {
    const audio = activeSFX.get(id);
    if (!audio) return;
    stopAudio(audio);
    activeSFX.delete(id);
}

function stopAudio(audioElement) {
    if (!audioElement) return;
    audioElement.pause();
    audioElement.currentTime = 0;
}

async function endQuiz(quizCompleted) {
    quiz.state.current = GAME_STATES.END;

    const completionMessage = quizCompleted ? END_GAME_MESSAGES.quizCompleted : END_GAME_MESSAGES.outOfTime;

    prepareGameEndUI(quizCompleted, completionMessage);
    await playSFXSafe(SFX_FILENAMES[quizCompleted ? 'quizCompleted' : 'quizFailed']);

    elements.endGameUI.reviewButton.disabled = false;
}

function prepareGameEndUI(quizCompleted, message) {
    elements.navButtons.pause.classList.add('hidden');
    elements.navButtons.pause.disabled = true;

    elements.endGameUI.finalScore.textContent = quiz.stats.score;
    elements.endGameUI.questionCount.textContent = quiz.questions.count;
    elements.endGameUI.message.textContent = message;
    
    toggleCompletionScreen();

    if (quizCompleted) {
        startFireworksDisplay();
    }
}

function startFireworksDisplay() {
    function getRandomDelay() {
        return Math.floor(Math.random() * (fireworks.maxDelay - fireworks.minDelay)) + fireworks.minDelay;
    }

    function animateFireworks(now) {
        if (now - lastFireworkTime > randomDelay) {
            spawnFirework(elements.endGameUI.fireworksBackground);

            lastFireworkTime = now;
            randomDelay = getRandomDelay();
        }
        fireworks.animationFrameID = requestAnimationFrame(animateFireworks);
    }

    let lastFireworkTime = performance.now();
    let randomDelay = getRandomDelay();

    fireworks.animationFrameID = requestAnimationFrame(animateFireworks);
}

function spawnFirework(backgroundElement) {
    const fireworkXPos = Math.random() * 100;
    const fireworkYPos = Math.random() * 100;

    const starCount = Math.floor(Math.random() * (fireworks.maxStars - fireworks.minStars + 1)) + fireworks.minStars;

    const firework = document.createElement('div');
    firework.classList.add('firework'); 
    firework.style.left = `${fireworkXPos}%`;
    firework.style.top = `${fireworkYPos}%`;

    let backgroundLayers = [];

    const baseHue = Math.floor(Math.random() * 360);

    for (let i = 0; i < starCount; i++) {
        const starXPos = Math.floor(Math.random() * 100);
        const starYPos = Math.floor(Math.random() * 100);

        const hueOffset = Math.floor(
            Math.random() * (fireworks.maxHueVariation + 1) - fireworks.maxHueVariation / 2
        );
        
        const lightness = Math.floor(Math.random() * fireworks.maxLightnessVariation) + 50;

        const star = `radial-gradient(circle, hsl(${baseHue + hueOffset}, 100%, ${lightness}%) var(--star-size), transparent 70%) ${starXPos}% ${starYPos}%`;

        backgroundLayers.push(star);
    }

    firework.style.background = backgroundLayers.join(', ');
    firework.style.backgroundRepeat = 'no-repeat';
    firework.style.backgroundSize = 'calc(var(--star-size) * 2) calc(var(--star-size) * 2)';

    const explosionDiameter = Math.floor(Math.random() * (fireworks.maxPctDiameter - fireworks.minPctDiameter)) + fireworks.minPctDiameter;

    firework.style.setProperty('--pct-diameter', `${explosionDiameter}%`);
    firework.style.setProperty('--duration', `${fireworks.maxDuration * explosionDiameter / 100}s`);
    
    firework.addEventListener('animationend', (event) => {
        if (event.animationName === 'explode-firework') {
            firework.remove();
        }
    });

    backgroundElement.appendChild(firework);
}

function updateReviewButtons() {
    const atFirstIndex = quiz.questions.currentIndex === 0;
    const atLastIndex = quiz.questions.currentIndex === quiz.questions.list.length - 1;

    setButtonDisabledState(elements.gameplayControls.prevReview, atFirstIndex);
    setButtonDisabledState(elements.gameplayControls.nextReview, atLastIndex);
}

function updateInputWidth(input, charCount) {
    if (input.value.length > charCount) input.value = input.value.slice(0, charCount);
    input.style.width = `${input.value.length + 1}ch`;
}

function setCustomValidationMessages(input) {
    const messages = {
        valueMissing: `入力が必要です`,
        rangeUnderflow: `${input.min}以上の数値を入力してください`,
        rangeOverflow: `${input.max}以下の数値を入力してください`,
        badInput: `数値を入力してください`,
    }

    for (const [error, message] of Object.entries(messages)) {
        if (input.validity[error]) {
            input.setCustomValidity(message);
            return;
        }
    }

    input.setCustomValidity('');
}

function updateSpinnerValue(input, change) {
    const min = input.min !== '' ? Number(input.min) : -Infinity;
    const max = input.max !== '' ? Number(input.max) : Infinity;
    const step = Number(input.step) || 1;

    const value = Number(input.value) || 0;
    const newValue = value + change * step;
    input.value = Math.max(Math.min(newValue, max), min);

    updateInputWidth(input, 5);
    updateSliderAttributes(input.value);
}

function updateSliderAttributes(questionCount) {
    const slider = elements.menu.settings.quizTimeAllowance;
    const filledPortion = (slider.value - slider.min) / (slider.max - slider.min);
    const newMinValue = DEFAULT_SETTINGS.minTimePerQuestion * questionCount;
    const newMaxValue = DEFAULT_SETTINGS.maxTimePerQuestion * questionCount;

    slider.min = newMinValue;
    slider.max = newMaxValue;
    slider.value = filledPortion * (newMaxValue - newMinValue) + newMinValue;

    slider.dispatchEvent(new Event('input', { bubbles : true }));
}

function stopGameplay() {
    recognition.stop();
    pauseTimer();
    stopAllSFX();
    stopAudio(elements.vocabAudio)
    resetGame();
}

function pauseGame() {
    quiz.state.previous = quiz.state.current;
    quiz.state.current = GAME_STATES.PAUSED;

    recognition.stop()
    pauseTimer();
    pauseAllSFX();
    
    if (!elements.vocabAudio.paused) {
        elements.vocabAudio.pause();
    }

    elements.dialogs.pause.showModal();
}

function pauseAllSFX() {
    activeSFX.forEach((value, key) => pauseSFX(key));
}

function pauseSFX(id) {
    const audio = activeSFX.get(id);
    if (!audio) return;
    if (!audio.paused) audio.pause();
}

function resumeGame() {
    quiz.state.current = quiz.state.previous;
    quiz.state.previous = null;

    const audio = elements.vocabAudio;

    if (audio.paused && audio.currentTime > 0 && audio.currentTime < audio.duration) {
        elements.vocabAudio.play().catch(error => console.warn(`Failed to resume audio: ${error}`));
    }

    restartRecognition();
    resumeAllSFX();

    if (quiz.state.current === GAME_STATES.QUESTION) startTimer();
}

function resumeAllSFX() {
    activeSFX.forEach((value, key) => resumeSFX(key));
}

function resumeSFX(id) {
    const audio = activeSFX.get(id);
    if (!audio) return;
    if (audio.paused) {
        audio.play().catch(error => console.warn(`Failed to resume audio: ${error}`));
    }
}

function skipQuestion() {
    if (quiz.state.current === GAME_STATES.MATCHED || quiz.questions.currentIndex === quiz.questions.count - 1) return;

    const [currentQuestion] =  quiz.questions.list.splice(quiz.questions.currentIndex, 1);
    quiz.questions.list.push(currentQuestion);
    renderQuestion();
}

async function findMatch(event, targetText) {
    if (quiz.state.current !== GAME_STATES.QUESTION) return;

    const re = new RegExp(String.raw`\b${targetText}\b`, 'i');
    let transcript = '';
    
    for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript.toLowerCase();
        if (re.test(transcript)) {
            handleMatch(transcript);
            return
        } else if (event.results[i].isFinal) {
            playSFXSafe(SFX_FILENAMES.incorrect);
        }
    }

    updateTranscriptDisplay(transcript);
}

async function handleMatch(transcript) {
    quiz.state.current = GAME_STATES.MATCHED;

    recognition.stop();
    pauseTimer();
    pauseAllSFX();
    updateScore();
    updateTranscriptDisplay(transcript);
    await playSFXSafe(SFX_FILENAMES.correct);

    const finalQuestion = quiz.questions.currentIndex === quiz.questions.count - 1

    if (finalQuestion) {
        endQuiz(true);
    } else {
        nextQuestion();
    }
}

function updateScore() {
    quiz.stats.score++;
    updateScoreDisplay();
}

function updateScoreDisplay() {
    const score = quiz.stats.score
    const questionCount = quiz.questions.count;
    const percentAnswered = score / questionCount * 100;

    elements.scoreDisplay.score.textContent = score
    elements.statusBars.quizProgress.fill.style.width = `${percentAnswered}%`;
}

function nextQuestion() {
    quiz.state.current = GAME_STATES.QUESTION;
    changeQuestionIndex(quiz.questions.currentIndex + 1);
}

async function changeQuestionIndex(newIndex) {
    if (newIndex < 0 || newIndex >= quiz.questions.list.length) return;
    quiz.questions.currentIndex = newIndex;
    renderQuestion();
}

function handleRecognitionError(event) {
    console.log(`Error occured in recognition: ${event.error}`);

    if (event.error === 'no-speech') {
        restartRecognition();
    }
}

function reviewQuiz() {
    quiz.state.current = GAME_STATES.REVIEW;
    
    prepareReviewUI();
    changeQuestionIndex(0);
}

function prepareReviewUI() {
    cancelAnimationFrame(fireworks.animationFrameID);

    elements.statusBars.countdownTimer.bar.parentElement.classList.add('hidden');
    elements.countdownTimer.classList.add('hidden');
    elements.vocabDisplay.transcript.display.classList.add('hidden');

    toggleGameplayButtons();
    toggleCompletionScreen();
}

// == Event listeners ==
document.addEventListener('keydown', (event) => {
    const currentState = quiz.state.current;

    if (event.key === 'Escape' && currentState !== GAME_STATES.MENU && currentState !== GAME_STATES.PAUSED) {
        event.preventDefault();
        stopGameplay();
    }

    if (event.key === 'Enter'&& currentState === GAME_STATES.END && !elements.endGameUI.reviewButton.disabled) {
        event.preventDefault();
        reviewQuiz();
    }

    if (event.key === ' ' && (currentState === GAME_STATES.QUESTION || currentState === GAME_STATES.REVIEW) && !elements.gameplayControls.playAudio.disabled) {
        event.preventDefault();
        playAudio();
    }

    if (currentState === GAME_STATES.REVIEW) {
        if (event.key === 'ArrowLeft') {
            event.preventDefault();
            changeQuestionIndex(quiz.questions.currentIndex - 1);
        }

        if (event.key === 'ArrowRight') {
            event.preventDefault();
            changeQuestionIndex(quiz.questions.currentIndex + 1);
        }
    }
});

elements.menu.settings.numberInputs.forEach(input => {
    input.addEventListener('input', () => {
        updateInputWidth(input, 5);
        setCustomValidationMessages(input);
    });

    input.addEventListener('invalid', () =>  setCustomValidationMessages(input));
});

elements.menu.settings.numberSpinButtons.forEach(button => {
    const input = document.querySelector(button.dataset.target);
    const change = Number(button.dataset.change);
    if (!input || isNaN(change)) return;
    
    button.addEventListener('click', () => {
        updateSpinnerValue(input, change);
    });
});

elements.menu.settings.questionCount.addEventListener('input', (event) => {
    updateSliderAttributes(event.target.value);
});

elements.menu.settings.questionCount.addEventListener('change', () => {
    elements.menu.settings.useAllQuestions.checked = false;
});

elements.menu.settings.useAllQuestions.addEventListener('input', (event) => {
    if (event.target.checked) {
        elements.menu.settings.questionCount.value = vocabData.maxQuestionCount;
        elements.menu.settings.questionCount.dispatchEvent(new Event('input', { bubbles : true }));
    };
});

elements.menu.settings.useTimer.addEventListener('change', (event) => {
    const checked = event.target.checked
    timer.useTimer = checked;
    elements.menu.settings.quizTimeAllowance.closest('.menu-option')?.classList.toggle('hidden', !checked);
});

elements.menu.settings.quizTimeAllowance.addEventListener('input', (event) => {
    const slider = event.target;
    const filledPct = (slider.value - slider.min) / (slider.max - slider.min) * 100;
    slider.style.setProperty('--fill', `${filledPct}%`);
    elements.menu.settings.timeAllowanceReading.textContent = formatTime(slider.value);
});

elements.menu.settings.form.addEventListener('submit', (event) => {
    event.preventDefault();
    newQuiz();
});

elements.navButtons.home.addEventListener('click', () => {
    stopGameplay();
    resetGame();
});

elements.navButtons.pause.addEventListener('click', pauseGame);

elements.dialogs.pause.addEventListener('close', resumeGame);

elements.gameplayControls.playAudio.addEventListener('click', () => {
    if (quiz.state.current === GAME_STATES.MATCHED) return;
    playAudio();
});

elements.gameplayControls.skip.addEventListener('click', skipQuestion);

recognition.addEventListener('result', (event) => {
    findMatch(event, quiz.currentQuestion.eng);
});

recognition.addEventListener('error', (event) => {
    handleRecognitionError(event);
});

elements.vocabDisplay.transcript.restartRecognitionButton.addEventListener('click', restartRecognition);

elements.gameplayControls.prevReview.addEventListener('click', () => {
    changeQuestionIndex(quiz.questions.currentIndex - 1);
});

elements.gameplayControls.nextReview.addEventListener('click', () => {
    changeQuestionIndex(quiz.questions.currentIndex + 1);
});

elements.endGameUI.reviewButton.addEventListener('click', reviewQuiz);

document.addEventListener('DOMContentLoaded', () => {
    init();
});