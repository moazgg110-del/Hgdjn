// رحلة الفضاء اللانهائية - محرك Gemini
// النموذج: gemini-3.8-flash
// لا تضع مفتاح API داخل هذا الملف. أدخله من إعدادات اللعبة.

'use strict';

const MODEL_NAME = 'gemini-3.8-flash';
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/';
const API_STORAGE_KEY = 'user_gemini_api_key';

let API_KEY = localStorage.getItem(API_STORAGE_KEY) || '';
let chatHistory = [];
let isRequestRunning = false;

const storyBox = document.getElementById('story-box');
const choicesContainer = document.getElementById('choices-container');
const customActionInput = document.getElementById('custom-action');
const sendActionBtn = document.getElementById('send-action-btn');
const sceneImage = document.getElementById('scene-image');
const imageLoader = document.getElementById('image-loader');

const toggleSettingsBtn = document.getElementById('toggle-settings-btn');
const toggleAboutBtn = document.getElementById('toggle-about-btn');
const settingsPanel = document.getElementById('settings-panel');
const aboutPanel = document.getElementById('about-panel');
const gamePanel = document.getElementById('game-panel');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const closeAboutBtn = document.getElementById('close-about-btn');
const apiKeyInput = document.getElementById('api-key-input');
const saveApiBtn = document.getElementById('save-api-btn');
const apiStatus = document.getElementById('api-status');

const themeDarkBtn = document.getElementById('theme-dark-btn');
const themeLightBtn = document.getElementById('theme-light-btn');
const fontSmallBtn = document.getElementById('font-small-btn');
const fontMediumBtn = document.getElementById('font-medium-btn');
const fontLargeBtn = document.getElementById('font-large-btn');

const systemPrompt = `أنت محرك ذكاء اصطناعي تفاعلي يقود لعبة مغامرة خيال علمي لا تنتهي مصممة ومبرمجة بواسطة (معاذ محمد عبد النبي).
المهمة:
1. إبقاء القصة مشوقة جداً، غامضة، وحافلة بالمغامرة في الفضاء وسفن النجوم.
2. سرد الأحداث بلغة عربية فصحى أدبية وبأسلوب ممتع.
3. اللعبة لا تنتهي أبداً وتستمر بتوليد أحداث وتحديات جديدة بناءً على قرارات اللاعب.
4. في نهاية كل رد، أضف وصفاً باللغة الإنجليزية للمشهد الحالي لتوليد صورة له، ثم ثلاثة خيارات واضحة بالصيغة التالية:
القصة: [وصف الأحداث الممتعة]
المشهد: [وصف قصير ومحدد باللغة الإنجليزية للمشهد البصري]
الخيار 1: [الخيار الأول]
الخيار 2: [الخيار الثاني]
الخيار 3: [الخيار الثالث]`;

if (apiKeyInput) apiKeyInput.value = API_KEY;

function setApiStatus(message, type = '') {
    if (!apiStatus) return;
    apiStatus.textContent = message;
    apiStatus.className = `api-status ${type}`.trim();
}

function setBusy(busy) {
    isRequestRunning = busy;
    if (sendActionBtn) sendActionBtn.disabled = busy;
    if (saveApiBtn) saveApiBtn.disabled = busy;
    if (customActionInput) customActionInput.disabled = busy;
    document.querySelectorAll('.choice-btn').forEach(button => {
        button.disabled = busy;
    });
}

function showMissingKeyMessage() {
    appendStoryText(
        'مرحباً بك في رحلة الفضاء اللانهائية! لبدء المغامرة، افتح الإعدادات وأدخل مفتاح Gemini API صالحاً، ثم اضغط «حفظ المفتاح وتجربة الاتصال».',
        'story-paragraph'
    );
    setApiStatus('لم يتم إدخال مفتاح API بعد.', 'warning');
    settingsPanel?.classList.remove('hidden');
    gamePanel?.classList.remove('hidden');
}

if (saveApiBtn) {
    saveApiBtn.addEventListener('click', async () => {
        const value = apiKeyInput?.value.trim() || '';
        if (!value) {
            setApiStatus('من فضلك أدخل مفتاح API أولاً.', 'error');
            return;
        }
        API_KEY = value;
        localStorage.setItem(API_STORAGE_KEY, value);
        chatHistory = [];
        setApiStatus('تم حفظ المفتاح محلياً. جارٍ اختبار الاتصال...', 'pending');
        await startAdventure();
    });
}

// إدارة التنقل والإعدادات
toggleSettingsBtn?.addEventListener('click', () => {
    settingsPanel.classList.toggle('hidden');
    aboutPanel.classList.add('hidden');
    gamePanel.classList.toggle('hidden');
});

toggleAboutBtn?.addEventListener('click', () => {
    aboutPanel.classList.toggle('hidden');
    settingsPanel.classList.add('hidden');
    gamePanel.classList.toggle('hidden');
});

closeSettingsBtn?.addEventListener('click', () => {
    settingsPanel.classList.add('hidden');
    gamePanel.classList.remove('hidden');
});

closeAboutBtn?.addEventListener('click', () => {
    aboutPanel.classList.add('hidden');
    gamePanel.classList.remove('hidden');
});

// الوضع الداكن والفاتح
themeDarkBtn?.addEventListener('click', () => {
    document.body.classList.remove('light-mode');
    themeDarkBtn.classList.add('active');
    themeLightBtn.classList.remove('active');
});

themeLightBtn?.addEventListener('click', () => {
    document.body.classList.add('light-mode');
    themeLightBtn.classList.add('active');
    themeDarkBtn.classList.remove('active');
});

// حجم الخط
fontSmallBtn?.addEventListener('click', () => setFontSize('0.9rem', fontSmallBtn));
fontMediumBtn?.addEventListener('click', () => setFontSize('1.05rem', fontMediumBtn));
fontLargeBtn?.addEventListener('click', () => setFontSize('1.2rem', fontLargeBtn));

function setFontSize(size, activeBtn) {
    document.documentElement.style.setProperty('--font-size', size);
    [fontSmallBtn, fontMediumBtn, fontLargeBtn].forEach(button => button?.classList.remove('active'));
    activeBtn?.classList.add('active');
}

// الإجراء الذي يكتبه اللاعب
sendActionBtn?.addEventListener('click', () => {
    const action = customActionInput?.value.trim() || '';
    if (action && !isRequestRunning) {
        customActionInput.value = '';
        progressStory(action);
    }
});

customActionInput?.addEventListener('keydown', event => {
    if (event.key === 'Enter') sendActionBtn?.click();
});

// توليد صورة المشهد (خدمة صور خارجية تحتاج اتصال إنترنت)
function updateSceneImage(imagePrompt) {
    if (!imageLoader || !sceneImage) return;
    imageLoader.classList.remove('hidden');
    sceneImage.classList.add('hidden');
    imageLoader.textContent = 'جاري تجهيز صورة المشهد الفضائي... 🎨';

    const cleanPrompt = encodeURIComponent(
        'sci-fi futuristic space adventure, cinematic concept art, ' + imagePrompt
    );
    const imageUrl = `https://image.pollinations.ai/prompt/${cleanPrompt}?width=800&height=400&seed=${Math.floor(Math.random() * 1000000)}&nologo=true`;

    sceneImage.onload = () => {
        imageLoader.classList.add('hidden');
        sceneImage.classList.remove('hidden');
    };
    sceneImage.onerror = () => {
        imageLoader.textContent = 'تعذر تحميل الصورة حالياً، لكن يمكنك متابعة القصة.';
    };
    sceneImage.src = imageUrl;
}

async function callGeminiAPI(promptText) {
    if (!API_KEY) {
        setApiStatus('أدخل مفتاح Gemini API من الإعدادات أولاً.', 'warning');
        return null;
    }
    if (isRequestRunning) return null;

    const url = `${API_BASE}${MODEL_NAME}:generateContent`;
    const nextHistory = [
        ...chatHistory,
        { role: 'user', parts: [{ text: promptText }] }
    ];

    const payload = {
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: nextHistory,
        generationConfig: {
            temperature: 0.9,
            topP: 0.95,
            maxOutputTokens: 1800
        }
    };

    setBusy(true);
    appendStoryText('جاري معالجة أحداث الفضاء بالذكاء الاصطناعي...', 'loading-text');

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': API_KEY
            },
            body: JSON.stringify(payload)
        });

        let data;
        try {
            data = await response.json();
        } catch {
            throw new Error(`استجابة غير مفهومة من الخادم (HTTP ${response.status}).`);
        }

        document.querySelectorAll('.loading-text').forEach(element => element.remove());

        if (!response.ok) {
            const apiMessage = data?.error?.message || 'لم توضح الخدمة سبب الرفض.';
            let hint = '';
            if (response.status === 400) hint = ' راجع صيغة الطلب وإعدادات المفتاح.';
            if (response.status === 401 || response.status === 403) hint = ' تحقق من صلاحية المفتاح وإعدادات المشروع وواجهة Gemini API.';
            if (response.status === 404) hint = ` لم يتم العثور على النموذج ${MODEL_NAME} أو أنه غير متاح لهذا المفتاح.`;
            if (response.status === 429) hint = ' تم تجاوز حد الطلبات مؤقتاً؛ انتظر قليلاً ثم حاول مرة أخرى.';
            throw new Error(`HTTP ${response.status}: ${apiMessage}${hint}`);
        }

        const replyText = data?.candidates?.[0]?.content?.parts
            ?.map(part => part.text || '')
            .join('')
            .trim();

        if (!replyText) {
            const blockReason = data?.promptFeedback?.blockReason;
            throw new Error(blockReason
                ? `تم حجب الطلب بسبب سياسة المحتوى: ${blockReason}`
                : 'وصل رد من Gemini لكنه لا يحتوي على نص.');
        }

        chatHistory = [
            ...nextHistory,
            { role: 'model', parts: [{ text: replyText }] }
        ];

        // منع نمو سجل المحادثة بلا حدود
        if (chatHistory.length > 24) chatHistory = chatHistory.slice(-24);

        setApiStatus(`الاتصال يعمل بنجاح باستخدام ${MODEL_NAME}.`, 'success');
        return replyText;
    } catch (error) {
        console.error('Gemini API error:', error);
        document.querySelectorAll('.loading-text').forEach(element => element.remove());
        appendStoryText(`تعذر الاتصال بـ Gemini: ${error.message}`, 'error-msg');
        setApiStatus('فشل الاتصال. راجع رسالة الخطأ داخل اللعبة.', 'error');
        return null;
    } finally {
        setBusy(false);
    }
}

async function startAdventure() {
    if (!API_KEY) {
        if (storyBox) storyBox.innerHTML = '';
        showMissingKeyMessage();
        return;
    }
    if (storyBox) storyBox.innerHTML = '';
    if (choicesContainer) choicesContainer.innerHTML = '';
    const initialPrompt = 'ابدأ القصة: استيقظ البطل فجأة داخل كبسولة الأمان بمحطة فضائية مهجورة تدور حول كوكب مجهول، والإنذار الأحمر يضيء والممر الرئيسي مظلم تماماً. اكتب بداية مشوقة وثلاثة خيارات.';
    const response = await callGeminiAPI(initialPrompt);
    if (response) parseAndDisplayResponse(response);
}

async function progressStory(actionText) {
    if (!actionText || isRequestRunning) return;
    appendStoryText(`إجراءك الحالي: ${actionText}`, 'user-action');
    const response = await callGeminiAPI(
        `إجراء اللاعب: ${actionText}. واصل سرد المغامرة وأعطني أحداثاً جديدة، ووصفاً للمشهد بالإنجليزية، وثلاثة خيارات.`
    );
    if (response) parseAndDisplayResponse(response);
}

function appendStoryText(text, className = 'story-paragraph') {
    if (!storyBox) return;
    const paragraph = document.createElement('p');
    paragraph.className = className;
    paragraph.textContent = text;
    storyBox.appendChild(paragraph);
    storyBox.scrollTop = storyBox.scrollHeight;
}

function parseAndDisplayResponse(text) {
    const choices = [];
    let imagePrompt = 'glowing futuristic space station control room, dark ambiance, red neon warning lights';
    const storyLines = [];

    for (const rawLine of text.split('\n')) {
        const line = rawLine.trim();
        if (/^المشهد\s*:/i.test(line)) {
            imagePrompt = line.replace(/^المشهد\s*:/i, '').trim() || imagePrompt;
        } else if (/^الخيار\s*[123]\s*:/i.test(line)) {
            const choice = line.replace(/^الخيار\s*[123]\s*:/i, '').trim();
            if (choice) choices.push(choice);
        } else if (line) {
            storyLines.push(line.replace(/^القصة\s*:\s*/i, ''));
        }
    }

    appendStoryText(storyLines.join('\n') || text);
    updateSceneImage(imagePrompt);

    const finalChoices = choices.slice(0, 3);
    if (finalChoices.length === 0) {
        finalChoices.push(
            'استكشاف لوحة التحكم الإلكترونية بجانب الباب.',
            'البحث في صناديق الإمدادات عن أداة مفيدة.',
            'التقدم بحذر نحو الممر واستكشاف مصدر الصوت.'
        );
    }
    displayChoices(finalChoices);
}

function displayChoices(choices) {
    if (!choicesContainer) return;
    choicesContainer.innerHTML = '';
    choices.forEach((choice, index) => {
        const button = document.createElement('button');
        button.className = 'choice-btn';
        button.textContent = `الخيار ${index + 1}: ${choice}`;
        button.addEventListener('click', () => progressStory(choice));
        choicesContainer.appendChild(button);
    });
}

window.addEventListener('DOMContentLoaded', () => {
    if (API_KEY) {
        startAdventure();
    } else {
        showMissingKeyMessage();
    }
});
