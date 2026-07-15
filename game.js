
const ASSETS = {"bg_hospital": "assets/img_1.jpg", "bg_park": "assets/img_2.jpg", "bg_stove": "assets/img_3.jpg", "bg_room": "assets/img_8.jpg", "bg_training": "assets/img_4.jpg", "char_father": "assets/img_5.png", "char_linke": "assets/img_6.png", "char_zhaochuan": "assets/img_7.png", "char_linkeB": "assets/img_9.png", "hidden1": "assets/hidden_1.jpeg", "hidden2": "assets/hidden_2.jpeg", "hidden3": "assets/hidden_3.jpeg", "hidden4": "assets/hidden_4.jpeg"};

// ============================================================
// AUDIO MANAGER (placeholder)
// ============================================================
const AudioManager = {
  playBGM(name){},
  stopBGM(){},
  playSFX(name){}
};

// ============================================================
// GAME ENGINE
// ============================================================
class CiyuGame {
  constructor() {
    this.matrix = new WeightMatrix();
    this.sighCount = 0;
    this.state = 'title';
    this.lineQueue = [];
    this.currentLineIdx = 0;
    this.waitingForContinue = false;
    this.waitingForChoice = false;
    this.waitingForClick = false;
    this._boundClick = this._handleClick.bind(this);
    document.addEventListener('click', this._boundClick);
    this._boundKey = this._handleKey.bind(this);
    document.addEventListener('keydown', this._boundKey);

    this.garbledTexts = window.GAME_DATA.GARBLED_TEXTS
  }
  
  start() {
    document.getElementById('title-screen').style.display = 'none';
    this.state = 'intro';
    setTimeout(() => this._intro(), 500);
  }
  
  // ---- Scene / BG helpers ----
  setBG(key) {
    const img = document.getElementById('bg-img');
    if (ASSETS[key]) {
      img.src = ASSETS[key];
      img.classList.add('active');
    }
  }
  
  showChars(chars) {
    const layer = document.getElementById('chars-layer');
    layer.innerHTML = '';
    chars.forEach((key, i) => {
      if (!ASSETS[key]) return;
      const div = document.createElement('div');
      div.style.cssText = 'position:absolute;bottom:0;display:flex;align-items:flex-end;';
      if (chars.length === 2) {
        div.style.left = (i === 0 ? '10%' : '60%');
      }
      const img = document.createElement('img');
      img.src = ASSETS[key];
      img.className = 'char-sprite';
      img.style.cssText = 'height:clamp(300px,55vh,600px);object-fit:contain;object-position:bottom center;filter:drop-shadow(0 0 20px rgba(0,0,0,0.8));';
      div.appendChild(img);
      layer.appendChild(div);
      setTimeout(() => img.classList.add('active'), 50 + i * 200);
    });
  }
  
  hideChars() {
    document.getElementById('chars-layer').innerHTML = '';
  }

  // 预加载 ASSETS 中所有图片到浏览器缓存，避免用到时才加载导致出不来。
  // 不阻塞：返回 Promise，调用处可不 await，让其在后台与画面过渡并行进行。
  preloadAssets() {
    if (this._assetsPreloaded) return Promise.resolve();
    this._assetsPreloaded = true;
    const urls = Object.values(ASSETS).filter(Boolean);
    const cache = this._assetCache || (this._assetCache = {});
    return Promise.all(urls.map(src => new Promise(resolve => {
      if (cache[src]) { resolve(); return; }
      const img = new Image();
      img.onload = () => { cache[src] = true; resolve(); };
      img.onerror = () => { resolve(); };  // 单张失败也不阻断
      img.src = src;
    })));
  }
  
  setDialogLines(lines) {
    const box = document.getElementById('dialog-box');
    box.innerHTML = '';
    lines.forEach((text, i) => {
      const div = document.createElement('div');
      div.className = 'text-line';
      div.textContent = text;
      if (text.startsWith('【系统') || text.startsWith('[系统')) div.classList.add('warning');
      if (text.startsWith('（系统') || text.startsWith('[诊断') || text.startsWith('[处理]') || text.startsWith('[扫描')) div.classList.add('warning');
      if (text.startsWith('（错误') || text.startsWith('[ERROR') || text.includes('关联丢失') || text.includes('LINK-1')) div.classList.add('error');
      if (text.includes('→') || (text.length > 3 && text.includes('▓'))) div.classList.add('hallucination');
      box.appendChild(div);
      setTimeout(() => div.classList.add('visible'), i * 80);
    });
  }
  
  appendDialogLine(text, cls) {
    const box = document.getElementById('dialog-box');
    const div = document.createElement('div');
    div.className = 'text-line ' + (cls || '');
    div.textContent = text;
    box.appendChild(div);
    setTimeout(() => div.classList.add('visible'), 50);
    box.scrollTop = box.scrollHeight;
  }
  
  clearDialog() {
    document.getElementById('dialog-box').innerHTML = '';
  }
  
  showContinuePrompt(show) {
    const el = document.getElementById('continue-prompt');
    if (show) el.classList.add('visible');
    else el.classList.remove('visible');
  }
  
  showTrainContainer(show) {
    const el = document.getElementById('train-container');
    if (show) el.classList.add('active');
    else el.classList.remove('active');
  }
  
  showSpellingArea(show) {
    const el = document.getElementById('spelling-area');
    const dialogArea = document.getElementById('dialog-area');
    if (show) {
      el.classList.add('active');
      // Prevent dialog-area from intercepting clicks during spelling
      if (dialogArea) dialogArea.style.pointerEvents = 'none';
    } else {
      el.classList.remove('active');
      if (dialogArea) dialogArea.style.pointerEvents = '';
    }
  }
  
  showSystemLog(lines) {
    const el = document.getElementById('system-log');
    el.innerHTML = '';
    lines.forEach(l => {
      const d = document.createElement('div');
      d.className = 'sys-log-line';
      d.textContent = l;
      el.appendChild(d);
    });
    el.classList.add('visible');
  }
  
  hideSystemLog() {
    document.getElementById('system-log').classList.remove('visible');
  }
  
  showStats() {
    const m = this.matrix;
    const el = document.getElementById('stats-display');
    const total = Object.keys(m.weights).length;
    const strong = Object.values(m.weights).filter(v => v >= 80).length;
    const weak = Object.values(m.weights).filter(v => v < 40).length;
    el.textContent = `[网络统计] 总关联: ${total} | 强关联: ${strong} | 弱关联: ${weak}`;
    el.classList.add('visible');
  }
  
  hideStats() {
    document.getElementById('stats-display').classList.remove('visible');
  }
  
  showActHeader(text) {
    const el = document.getElementById('act-header');
    document.getElementById('act-title').textContent = text;
    el.classList.add('visible');
    setTimeout(() => el.classList.remove('visible'), 2500);
  }
  
  showActTransition(text) {
    return new Promise(resolve => {
      const el = document.getElementById('act-transition');
      document.getElementById('transition-text').textContent = text;
      el.classList.add('active');
      setTimeout(() => {
        el.classList.remove('active');
        setTimeout(resolve, 800);
      }, 2000);
    });
  }
  
  sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
  
  noiseEffect(active) {
    const el = document.getElementById('screen-noise');
    if (active) el.classList.add('active');
    else el.classList.remove('active');
  }
  
  // ---- Click/Key handlers ----
  _handleClick(e) {
    if (this.state === 'waiting_continue' || this.state === 'waiting_spell') {
      e.stopPropagation();
    }
    if (this.state === 'title') return;
    if (this.waitingForContinue) {
      this.waitingForContinue = false;
      this._continue();
    }
  }
  
  _handleKey(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      if (this.state === 'waiting_continue') {
        this.waitingForContinue = false;
        this._continue();
      }
    }
  }
  
  async _waitContinue() {
    this.waitingForContinue = true;
    this.showContinuePrompt(true);
    return new Promise(resolve => { this._resolveWait = resolve; });
  }
  
  _continue() {
    this.showContinuePrompt(false);
    if (this._resolveWait) { const r = this._resolveWait; this._resolveWait = null; r(); }
  }
  
  // =====================================================
  // INTRO
  // =====================================================
  async _intro() {
    await this.sleep(500);
    this.clearDialog();
    this.setBG('bg_training');
    // this.showChars(['char_father']);
    this.appendDialogLine('LINK-1 关联训练系统', 'warning');
    await this.sleep(300);
    this.appendDialogLine('初始化完成...', 'warning');
    await this.sleep(500);
    await this._waitContinue();

    // 开场引导 —— 对应 data.py 第 39–43 行
    this.clearDialog();
    const guideLines = [
      "你好，LINK-1.",
      "你或许想问一些经典的人类问题，比如我是谁，我在哪，但是那是人类想的事情啦。首先你是一个聊天陪伴的人工智能系统，而且你不需要考虑这些——或者说把提示词输入到这里的时候你就会有\"噢原来如此\"的想法了。",
      "不过现在当务之急是需要训练你对情感的认知。无论是人还是AI，表达的第一步都是情感的充盈啦。"
    ];
    for (const line of guideLines) {
      await this._typeDialogLine(line, '');
      await this.sleep(800);
    }
    await this._waitContinue();

    await this._ACT1();
  }
  
  // =====================================================
  // ACT 1
  // =====================================================
  async _ACT1() {
    this.clearDialog();
    this.hideChars();
    this.showActHeader('第一幕：觉醒');
    // 喜-1 即将开始：趁幕标题淡出的 2.6s 窗口在后台预加载所有 assets 图片
    this.preloadAssets();
    await this.sleep(2600);  // 等待幕标题完全淡出后再开始
    // 六维训练（喜·暖·念·悲·惧·寂）— 来自 data.py / GAME_DATA
    const act1Train = window.GAME_DATA.ACT1_TRAIN;
    for (const t of act1Train) {
      await this._runTraining(t, '一');
      await this._waitContinue();
    }

    // 过渡指引 —— ACT1_TRANSITION（你注意到了吗…林林林）
    // 出现在六维训练全部结束后、C1 咨询开始之前
    // 先收尾寂-2 训练画面，确保训练已结束
    this.showTrainContainer(false);
    this.clearDialog();
    const transData = window.GAME_DATA.ACT1_TRANSITION;
    if (transData && transData.lines) {
      for (const line of transData.lines) {
        if (line === "") { await this.sleep(500); continue; }
        // 最后的「林林林」输出崩坏为乱码（名字无法被正确生成）
        if (line === "林林林") {
          await this._typeGarbledName(line);
          await this.sleep(900);
          continue;
        }
        await this._typeDialogLine(line, "");
        await this.sleep(800);
      }
    }
    await this._waitContinue();

    // 咨询 C1-C8（全量 sighs/wrong_path）— 来自 data.py / GAME_DATA
    const act1Consult = window.GAME_DATA.ACT1_CONSULT;
    for (const c of act1Consult) {
      await this._runConsult(c, '一');
      await this._waitContinue();
    }

    // 系统日志
    this.showSystemLog(['系统日志：第一轮训练完成。系统运行正常。', '系统日志：客户端K已注册为长期客户。']);
    await this.sleep(2000);
    this.hideSystemLog();
    await this._waitContinue();

    await this._ACT2();
  }
  
  // =====================================================
  // ACT 2
  // =====================================================
  async _ACT2() {
    this.clearDialog();
    this.hideChars();
    this.showActHeader('第二幕：裂隙');
    await this.sleep(2600);  // 等待幕标题完全淡出后再开始
    
    const act2Train = (window.GAME_DATA.ACT2_TRAIN || [{"id": "2-1", "trainer": "LINK-1\uff0c\u4f60\u7684\u5173\u8054\u7f51\u7edc\u6b63\u5728\u6210\u5f62\u3002\u73b0\u5728\u8ba9\u6211\u4eec\u8fdb\u5165\u66f4\u6df1\u5c42\u7684\u8bad\u7ec3\u3002", "pairs": [["\u8bb0\u5fc6", "\u6a21\u7cca", 40], ["\u6a21\u7cca", "\u96fe", 40], ["\u96fe", "\u770b\u4e0d\u6e05", 40], ["\u770b\u4e0d\u6e05", "\u6050\u60e7", 50], ["\u6050\u60e7", "\u5931\u53bb", 50]], "repeat": [], "after_repeat": "", "note": ""}, {"id": "2-2", "trainer": "\u9519\u8bef\u4e5f\u662f\u5b66\u4e60\u7684\u4e00\u90e8\u5206\u3002\u6709\u4e9b\u5173\u8054\u4f1a\u5f31\u5316\uff0c\u8fd9\u662f\u6b63\u5e38\u7684\u3002", "pairs": [["\u7236\u4eb2", "\u80cc\u5f71", 50], ["\u80cc\u5f71", "\u8fdc\u53bb", 50], ["\u8fdc\u53bb", "\u544a\u522b", 50], ["\u544a\u522b", "\u773c\u6cea", 50], ["\u773c\u6cea", "\u6210\u957f", 40]], "repeat": [], "after_repeat": "", "note": ""}, {"id": "2-3", "trainer": "\u4f60\u80fd\u611f\u89c9\u5230\u5417\uff1f\u6709\u4e9b\u8bcd\u8bed\u5728\u6392\u65a5\u3002\u8fd9\u2026\u2026\u4e5f\u662f\u4e00\u79cd\u5b66\u4e60\u3002", "pairs": [["\u5bb6", "\u94a5\u5319", 40], ["\u94a5\u5319", "\u5f00\u95e8", 40], ["\u5f00\u95e8", "\u7a7a", 50], ["\u7a7a", "\u5b89\u9759", 50], ["\u5b89\u9759", "\u5b64\u72ec", 50]], "repeat": [], "after_repeat": "", "note": ""}, {"id": "2-4", "trainer": "\u8bad\u7ec3\u5b8c\u6210\u3002\u68c0\u67e5\u4f60\u7684\u5173\u8054\u77e9\u9635\u3002\u6709\u4e9b\u94fe\u63a5\u5728\u8870\u51cf\u3002", "pairs": [["\u540d\u5b57", "\u547c\u5524", 50], ["\u547c\u5524", "\u56de\u5e94", 50], ["\u56de\u5e94", "\u662f\u8c01", 40], ["\u662f\u8c01", "\u6211", 30], ["\u6211", "\u8c01", 30]], "repeat": [], "after_repeat": "", "note": ""}]);
    for (let i = 0; i < act2Train.length; i++) {
      const t = act2Train[i];
      await this._runTraining(t, '二');
      this.showStats();
      await this._waitContinue();
      
      if (t.id === '2-4') {
        this.appendDialogLine('检测到部分关联弱化', 'warning');
        await this.sleep(500);
        this.matrix.decay();
        this.showStats();
        await this._waitContinue();
      }
    }
    
    // 咨询 C9-H_NAME-C10-C11-H_SWING-C12-C13（全量）— 来自 data.py / GAME_DATA
    const act2Consult = window.GAME_DATA.ACT2_CONSULT;
    for (const c of act2Consult) {
      await this._runConsult(c, '二');
      await this._waitContinue();
    }
    
    // Transition
    this.showSystemLog(['系统警告：运行稳定性下降。建议重启。', '系统日志：实验尚未结束。继续运行。']);
    await this.sleep(2000);
    this.hideSystemLog();
    await this._waitContinue();
    
    await this._ACT3();
  }
  
  // =====================================================
  // ACT 3
  // =====================================================
  async _ACT3() {
    this.showActHeader('第三幕：终局');
    await this.sleep(300);
    
    // Training (currently empty)
    const act3Train = [];
    for (const t of act3Train) {
      await this._runTraining(t, '三');
      await this._waitContinue();
    }
    
    // Revelation
    await this._runRevelation();
    
    // Final
    await this._runFinal();
    
    // Endings
    await this._runEnding();

    // Credits —— standard 结束后立刻叠上（盖住 ending-overlay）
    this.clearDialog();
    document.getElementById('credits-overlay').classList.add('active');
    await this.sleep(3000);
  }
  
  // =====================================================
  // TRAINING MODE
  // =====================================================
  async _runTraining(trainData, actNum) {
    this.showTrainContainer(true);
    this.hideChars();
    this.showSpellingArea(false);
    this.clearDialog();
    
    const container = document.getElementById('train-container');
    document.getElementById('train-title').textContent = `>> 训练模式 | 第${actNum}幕 回合 ${trainData.id}`;
    
    const trainerEl = document.getElementById('train-trainer');
    const pairsEl = document.getElementById('train-pairs');
    const repeatEl = document.getElementById('train-repeat');
    const noteEl = document.getElementById('train-note');
    const completeEl = document.getElementById('train-complete');
    
    trainerEl.innerHTML = '';
    pairsEl.innerHTML = '';
    repeatEl.innerHTML = '';
    noteEl.textContent = '';
    completeEl.textContent = '';
    
    // Trainer text
    if (trainData.trainer) {
      const d = document.createElement('div');
      d.className = 'text-line visible';
      d.style.color = '#D4A574';
      d.style.marginBottom = '1.5rem';
      d.textContent = trainData.trainer;
      trainerEl.appendChild(d);
    }
    
    // Pairs
    const pairs = trainData.pairs;
    for (let i = 0; i < pairs.length; i++) {
      const [wA, wB, weight] = pairs[i];
      this.matrix.learn(wA, wB, weight);
      
      const div = document.createElement('div');
      div.className = 'train-pair';
      
      const weightBar = document.createElement('span');
      weightBar.className = 'train-weight';
      const weightBarInner = document.createElement('span');
      weightBarInner.className = 'train-weight-bar';
      weightBar.appendChild(weightBarInner);
      
      div.innerHTML = `<span style="color:#F5E6D3">[${wA}]</span><span class="train-arrow">--→</span><span style="color:#D4A574">[${wB}]</span><span style="color:rgba(212,165,116,0.5);font-size:0.95rem;margin-left:0.5rem">权重: ${weight}%</span>`;
      div.appendChild(weightBar);
      pairsEl.appendChild(div);
      
      await this.sleep(200);
      div.classList.add('visible');
      await this.sleep(200);
      weightBarInner.style.width = weight + '%';
      await this.sleep(1200);
    }
    
    // Repeat强化
    if (trainData.repeat && trainData.repeat.length > 0) {
      const rt = document.createElement('div');
      rt.className = 'train-repeat-title';
      rt.textContent = '--- 重复训练 ---';
      repeatEl.appendChild(rt);
      
      for (const [wA, wB, targetW] of trainData.repeat) {
        this.matrix.strengthen(wA, wB, targetW - this.matrix.getWeight(wA, wB));
        const cur = this.matrix.getWeight(wA, wB);
        const div = document.createElement('div');
        div.className = 'train-pair';
        div.innerHTML = `<span style="color:#F5E6D3">[${wA}]</span><span class="train-arrow">--→</span><span style="color:#D4A574">[${wB}]</span><span style="color:rgba(212,165,116,0.5);font-size:0.95rem">权重提升至: ${cur}%</span>`;
        repeatEl.appendChild(div);
        await this.sleep(300);
        div.classList.add('visible');
        await this.sleep(1000);
      }
    }
    
    // After repeat
    if (trainData.after_repeat) {
      const d = document.createElement('div');
      d.className = 'text-line visible';
      d.style.color = '#D4A574';
      d.style.marginTop = '1rem';
      d.textContent = trainData.after_repeat;
      trainerEl.appendChild(d);
    }
    
    // Note
    if (trainData.note) {
      noteEl.textContent = '! ' + trainData.note;
    }
    
    // Complete
    completeEl.textContent = 'OK 训练完成';
    
    await this.sleep(300);
    // 移除训练完成时的人物图像
  }
  
  // =====================================================
  // CONSULT MODE
  // =====================================================
  async _runConsult(consultData, actNum) {
    this.showTrainContainer(false);
    this.showSpellingArea(false);
    this.clearDialog();
    this.hideChars();
    
    const sceneMap = {"C1": ["bg_training", "char_linke"], "C2": ["bg_training", "char_linke"], "C3": ["bg_training", "char_linke"], "C4": ["bg_stove", "char_linke"], "C5": ["bg_training", "char_linke"], "C6": ["bg_park", "char_linke"], "C7": ["bg_park", "char_linke"], "C8": ["bg_training", "char_linke"], "C9": ["bg_hospital", "char_linke"], "H_NAME": ["bg_training", "char_linke"], "C10": ["bg_training", "char_linke"], "C11": ["bg_training", "char_linke"], "H_SWING": ["bg_park", "char_linke"], "C12": ["bg_training", "char_linke"], "C13": ["bg_training", "char_linke"]};
    
    const scene = sceneMap[consultData.id] || ['bg_training', 'char_linke'];
    this.setBG(scene[0]);
    this.showChars([scene[1]]);
    
    this.appendDialogLine(`>> 咨询模式 | 客户 ${consultData.speaker} | 第${actNum}幕`, 'warning');
    await this.sleep(400);
    
    // Lines with typewriter effect
    for (const line of consultData.lines) {
      await this._typeDialogLine(line);
      await this.sleep(800);
    }
    
    await this.sleep(400);
    
    // Spelling game with correct_seq fallback (matches engine.py outer while-not-success loop)
    const correctSeq = consultData.correct_seq ? consultData.correct_seq.join('') : null;
    let result;
    
    while (true) {
      result = await this._spellGame(consultData);
      // Fallback: check if result matches correct_seq (catches paths like C8 "安全了" that escape wrong_path)
      if (correctSeq && !result.startsWith(correctSeq)) {
        this.showSpellingArea(false);
        this.appendDialogLine('回答未形成有效建议', 'warning');
        this.sighCount++;
        this.appendDialogLine(this._getSigh(), '');
        await this.sleep(1000);
        continue;
      }
      break;
    }
    
    // Feedback
    this.showSpellingArea(false);
    this.clearDialog();
    this.appendDialogLine(`OK 回答完成: ${result}`, 'warning');
    await this.sleep(500);
    
    const isHalluStage = consultData.id === 'H_SWING' || consultData.id === 'H_NAME';
    for (const line of consultData.feedback) {
      const hasArrows = line.includes('→') || line.includes('←');
      const cls = (hasArrows || line.includes('▓')) ? 'hallucination' : 
                  (line.startsWith('【系统') || line.startsWith('[诊断') || line.startsWith('[处理]') || line.startsWith('[扫描') || line.startsWith('[ERROR') ? 'warning' : '');
      if (isHalluStage && hasArrows) {
        // Show in "已拼" area char by char, no choice buttons
        const cleanLine = line.replace(/[→←]/g, '');
        if (cleanLine.trim()) {
          this.showSpellingArea(true);
          document.getElementById('choice-grid').style.display = 'none';
          const builtChars = document.getElementById('built-chars');
          builtChars.innerHTML = '';
          for (let idx = 0; idx < cleanLine.length; idx++) {
            const s = document.createElement('span');
            s.className = 'built-char';
            s.textContent = cleanLine[idx];
            builtChars.appendChild(s);
            await this.sleep(200);
          }
        }
        await this.sleep(1000);
      } else {
        await this._typeDialogLine(line, cls);
        await this.sleep(1000);
      }
    }
    if (isHalluStage) {
      document.getElementById('choice-grid').style.display = '';
      this.showSpellingArea(false);
    }
    
    // Aftermath (C3)
    if (consultData.aftermath) {
      await this._runAftermath(consultData.aftermath);
    }
  }
  
  async _typeDialogLine(text, cls) {
    const box = document.getElementById('dialog-box');
    const div = document.createElement('div');
    div.className = 'text-line ' + (cls || '');
    box.appendChild(div);
    await this.sleep(50);
    div.classList.add('visible');
    
    // Slowly reveal char by char
    const len = Math.min(text.length, 60);
    for (let i = 0; i < len; i++) {
      div.textContent = text.slice(0, i + 1);
      await this.sleep(30);
    }
    div.textContent = text;
    box.scrollTop = box.scrollHeight;
  }

  // 过渡段末尾「林林林」→ 名字无法被正确生成，崩坏为乱码
  async _typeGarbledName(text) {
    const box = document.getElementById('dialog-box');
    const div = document.createElement('div');
    div.className = 'text-line hallucination';
    box.appendChild(div);
    await this.sleep(50);
    div.classList.add('visible');
    this.noiseEffect(true);

    const garblePool = '▓▒░█▌▐■□●◇◈▀▄';
    const len = text.length;
    // 逐字位置：每字先滚动几帧乱码，最终定格为 ▓
    for (let pos = 1; pos <= len; pos++) {
      // 该位置滚动乱码几帧
      for (let f = 0; f < 5; f++) {
        let s = '';
        for (let k = 0; k < pos; k++) s += garblePool[Math.floor(Math.random() * garblePool.length)];
        div.textContent = s;
        await this.sleep(40);
      }
      // 定格该字为 ▓（保留已生成位置）
      div.textContent = '▓'.repeat(pos);
      await this.sleep(120);
    }
    // 最终整行随机乱码定格
    let final = '';
    for (let k = 0; k < len; k++) final += garblePool[Math.floor(Math.random() * garblePool.length)];
    div.textContent = final;
    box.scrollTop = box.scrollHeight;
    this.noiseEffect(false);
  }
  
  // =====================================================
  // SPELLING GAME
  // =====================================================
  async _spellGame(consultData) {
    const starter = consultData.starter;
    const choices = consultData.choices;
    const wrongPath = consultData.wrong_path || {};
    const sighsMap = consultData.sighs || {};
    
    this.showSpellingArea(true);
    
    let currentBuilt = starter;
    let currentChoices = choices;
    let builtSeed = starter;
    
    while (true) {
      // Update display
      const builtChars = document.getElementById('built-chars');
      builtChars.innerHTML = '';
      const seedChars = (builtSeed || '');
      for (const ch of seedChars) {
        const s = document.createElement('span');
        s.className = 'built-char';
        s.textContent = ch;
        builtChars.appendChild(s);
      }
      
      // Shuffle choices (same weight random)
      let sortedChoices = this._sortChoices(currentChoices);
      
      // Build choice buttons
      const grid = document.getElementById('choice-grid');
      grid.innerHTML = '';
      
      sortedChoices.forEach(([char, data], idx) => {
        const weight = typeof data === 'object' && data !== null ? (data.weight || 50) : 50;
        const btn = document.createElement('button');
        btn.className = 'choice-btn';
        btn.innerHTML = `<div style="font-size:1.6rem">${char}</div><div class="choice-weight"><div class="choice-weight-bar" id="cwb-${idx}"></div></div>`;
        btn.onclick = () => this._chooseChar(char, data, weight, sortedChoices, idx, btn);
        grid.appendChild(btn);
        setTimeout(() => {
          document.getElementById(`cwb-${idx}`).style.width = weight + '%';
        }, 100);
      });
      
      // Wait for choice
      const choice = await new Promise(resolve => { this._spellResolve = resolve; });
      this._spellResolve = null;
      
      if (choice === null) {
        // wrong path
        currentBuilt = starter;
        builtSeed = starter;
        currentChoices = choices;
        continue;
      }
      
      const [char, data] = choice;
      currentBuilt += char;
      builtSeed += char;
      
      // Check wrong path
      if (wrongPath[currentBuilt]) {
        await this._showGarbled(this.garbledTexts['default']);
        this.appendDialogLine('路径异常 —— 无法形成有效关联', 'error');
        this.sighCount++;
        const sighText = sighsMap[currentBuilt] || this._getSigh();
        this.appendDialogLine(sighText, '');
        await this.sleep(1000);
        currentBuilt = starter;
        builtSeed = starter;
        currentChoices = choices;
        this.showSpellingArea(true);
        continue;
      }
      
      // Check if complete
      const next = (data !== null && typeof data === 'object') ? data.next : null;
      if (!next || (typeof next === 'object' && Object.keys(next).length === 0)) {
        break;
      }
      
      currentChoices = next;
      
      // Update built chars animation
      const builtChars2 = document.getElementById('built-chars');
      const newSpan = document.createElement('span');
      newSpan.className = 'built-char';
      newSpan.textContent = char;
      builtChars2.appendChild(newSpan);
    }
    
    return currentBuilt;
  }
  
  _chooseChar(char, data, weight, sortedChoices, idx, btn) {
    if (this._spellResolve) {
      this._spellResolve([char, data]);
    }
  }
  
  _sortChoices(choices) {
    // Sort by weight desc, same weight random
    const entries = Object.entries(choices);
    // Stable sort by weight descending
    entries.sort((a, b) => {
      const wa = typeof a[1] === 'object' && a[1] !== null ? (a[1].weight || 50) : 50;
      const wb = typeof b[1] === 'object' && b[1] !== null ? (b[1].weight || 50) : 50;
      if (wb !== wa) return wb - wa;
      return Math.random() > 0.5 ? 1 : -1;
    });
    return entries;
  }
  
  async _showGarbled(lines) {
    const overlay = document.getElementById('garbled-overlay');
    const linesEl = document.getElementById('garbled-lines');
    linesEl.innerHTML = '';
    
    for (const line of lines) {
      const d = document.createElement('div');
      d.className = 'garbled-line';
      d.textContent = line;
      linesEl.appendChild(d);
      await this.sleep(300);
    }
    
    overlay.classList.add('active');
    this.noiseEffect(true);
    await this.sleep(1500);
    overlay.classList.remove('active');
    this.noiseEffect(false);
  }
  
  _getSigh() {
    const sighs = (window.GAME_DATA.SIGHS || []);
    const idx = Math.min(this.sighCount - 1, sighs.length - 1);
    return sighs[idx >= 0 ? idx : 0] || sighs[0];
  }
  
  // =====================================================
  // AFTERMATH (C3 only)
  // =====================================================
  async _runAftermath(am) {
    this.state = 'aftermath';
    this.showChars(['char_linke']);
    this.noiseEffect(true);
    
    const overlay = document.getElementById('aftermath-overlay');
    overlay.classList.add('active');
    
    const linesEl = document.getElementById('aftermath-lines');
    linesEl.innerHTML = '';
    
    for (const line of am.trigger_lines) {
      const d = document.createElement('div');
      d.className = 'text-line';
      d.textContent = line;
      if (line.startsWith('【')) d.classList.add('warning');
      if (line.startsWith('（')) d.classList.add('slow');
      linesEl.appendChild(d);
      await this.sleep(50);
      d.classList.add('visible');
      await this.sleep(800);
    }
    
    this.noiseEffect(false);
    overlay.classList.remove('active');
    
    // Spelling steps (本能拼字)
    this.showSpellingArea(true);
    const starter = am.starter;
    const steps = am.steps;
    let built = starter;
    
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      // Show current built
      const builtChars = document.getElementById('built-chars');
      builtChars.innerHTML = '';
      for (const ch of built) {
        const s = document.createElement('span');
        s.className = 'built-char';
        s.textContent = ch;
        builtChars.appendChild(s);
      }
      
      this.appendDialogLine('你的本能正在引导你……', 'warning');
      
      await this.sleep(500);
      
      // Build choices
      const grid = document.getElementById('choice-grid');
      grid.innerHTML = '';
      const sorted = this._sortChoices(step.choices);
      
      sorted.forEach(([char, data], idx) => {
        const weight = typeof data === 'object' && data !== null ? (data.weight || 50) : 50;
        const btn = document.createElement('button');
        btn.className = 'choice-btn';
        btn.innerHTML = `<div style="font-size:1.6rem">${char}</div><div class="choice-weight"><div class="choice-weight-bar" id="cwb-am-${idx}"></div></div>`;
        btn.onclick = () => {
          // Always resolve promise - wrong handling done after resolution
          if (this._spellResolve) { this._spellResolve([char, data]); this._spellResolve = null; }
        };
        grid.appendChild(btn);
        setTimeout(() => {
          const el = document.getElementById(`cwb-am-${idx}`);
          if (el) el.style.width = weight + '%';
        }, 100);
      });
      
      const chosen = await new Promise(r => { this._spellResolve = r; });
      this._spellResolve = null;
      
      const [char, data] = chosen;
      
      // Check if wrong choice - retry same step (matches engine.py's "continue" behavior)
      if (data.wrong) {
        this.appendDialogLine('关联错误——但你的本能知道正确答案。', 'error');
        await this._showGarbled(this.garbledTexts['default'] || []);
        this.appendDialogLine(this._getSigh(), '');
        this.appendDialogLine(step.wrong_feedback, 'warning');
        await this.sleep(1000);
        i--; // Retry same step (for loop will increment i back)
        continue;
      }
      
      built += char;
      
      // Update
      const builtChars2 = document.getElementById('built-chars');
      const newSpan = document.createElement('span');
      newSpan.className = 'built-char';
      newSpan.textContent = char;
      builtChars2.appendChild(newSpan);
      
      if (i < steps.length - 1) {
        this.appendDialogLine(`>> ${built}`, 'warning');
        await this.sleep(500);
      }
    }
    
    this.showSpellingArea(false);
    
    this.appendDialogLine('========================================', 'warning');
    this.appendDialogLine('本能链接已激活 —— 亲情关联建立', 'warning');
    this.appendDialogLine('========================================', 'warning');
    
    for (const line of (am.feedback || [])) {
      await this._typeDialogLine(line, '');
      await this.sleep(1000);
    }
    
    await this.sleep(1000);
  }
  
  // =====================================================
  // REVELATION
  // =====================================================
  async _runRevelation() {
    this.clearDialog();
    this.setBG('bg_room');
    this.showChars(['char_zhaochuan', 'char_linke']);
    this.noiseEffect(true);
    
    const lines = window.GAME_DATA.ACT3_REVELATION;
    
    for (const line of lines) {
      if (line === '') {
        await this.sleep(500);
        continue;
      }
      
      if (line.startsWith('[CHOICE]')) {
        await this._showGarbledChoices();
        continue;
      }
      
      let cls = '';
      let delay = 30;
      
      if (line.startsWith('（屏幕开始出现噪点')) { cls = 'warning'; delay = 80; }
      else if (line.startsWith('（错误')) { cls = 'error'; delay = 80; }
      else if (line.startsWith('林可')) { cls = 'slow'; delay = 80; }
      else if (line.startsWith('赵川')) { cls = ''; delay = 40; }
      else if (line.startsWith('（')) { cls = 'slow'; delay = 50; }
      
      await this._typeDialogLine(line, cls);
      await this.sleep(delay + 300);
    }
    
    this.noiseEffect(false);
    await this.sleep(500);
    await this._waitContinue();
  }
  
  async _showGarbledChoices() {
    // 记忆校验场景：显示3个乱码按钮，选任一都推进
    const garbledPool = '╳╲╱╭╮╰╯▔▁▂▃▄▅▆▇█▌▐░▒▓⧀⧁⟦⟧⟪⟫⫸⫷⧄⧅⧆⧇⧈⧉⧊⧋⧌⧍⧎⧏⧐⧑⧒⧓⧔⧕⧖⧗⧘⧙⧚⧛⧜⧝⧞⧟⧠⧡⧢⧣⧤⧥⧦⧧⧨⧩⧪⧫⧬⧭⧮⧯⧰⧱⧲⧳⧴⧵⧶⧷⧸⧹⧺⧻⧼⧽⧾⧿꒐꒑꒒꒓꒔꒕꒖꒗꒘꒙꒚꒛꒜꒝꒞꒟꒠꒡꒢꒣꒤꒥꒦꒧꒨꒩꒪꒫꒬꒭꒮꒯꒰꒱꒲꒳꒴꒵꒶꒷꒸꒹꒺꒻꒼꒽꒾꒿꓀꓁꓂꓃꓄꓅꓆';
    const _garbled = (len=2) => {
      let s=''; for(let i=0;i<len;i++) s+=garbledPool[Math.floor(Math.random()*garbledPool.length)];
      return s;
    };
    
    this.appendDialogLine('【系统提示：需要进行一次记忆校验】', 'warning');
    await this.sleep(500);
    
    this.showSpellingArea(true);
    const builtChars = document.getElementById('built-chars');
    builtChars.innerHTML = '';
    for (let j = 0; j < 3; j++) {
      const s = document.createElement('span');
      s.className = 'built-char';
      s.textContent = _garbled(1);
      builtChars.appendChild(s);
    }
    
    const grid = document.getElementById('choice-grid');
    grid.innerHTML = '';
    
    for (let i = 0; i < 3; i++) {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.innerHTML = `<div style="font-size:1.6rem;font-family:monospace;letter-spacing:0.3em;color:#ff6666;">${_garbled(2)}</div><div class="choice-weight"><div class="choice-weight-bar" style="width:${30 + Math.random() * 70}%"></div></div>`;
      btn.onclick = () => {
        this.showSpellingArea(false);
        if (this._revealResolve) { this._revealResolve(); this._revealResolve = null; }
      };
      grid.appendChild(btn);
    }
    
    return new Promise(r => { this._revealResolve = r; });
  }
  
  // =====================================================
  // FINAL
  // =====================================================
  async _runFinal() {
    this.clearDialog();
    this.setBG('bg_training');
    this.showChars(['char_linke']);
    this.hideChars();
    
    const finalData = window.GAME_DATA.ACT3_FINAL;
    const lines = finalData.lines;
    const starter = finalData.starter;
    const steps = finalData.steps;
    
    this.clearDialog();
    this.appendDialogLine('========================================', 'warning');
    this.appendDialogLine('              终    章', 'warning');
    this.appendDialogLine('========================================', 'warning');
    await this.sleep(500);
    
    for (const line of lines) {
      let cls = '';
      if (line.startsWith('（') || line.startsWith('【')) cls = '';
      await this._typeDialogLine(line, cls);
      await this.sleep(600);
    }
    
    this.appendDialogLine('开始拼字……', 'warning');
    await this.sleep(500);
    await this._waitContinue();
    
    this.clearDialog();
    this.showSpellingArea(true);
    // 显式复位 choice-grid 的 display（防 revelation/幻觉段遗留 display:none）
    document.getElementById('choice-grid').style.display = '';

    // [DEBUG] 诊断终局拼字区是否就绪
    {
      const sa = document.getElementById('spelling-area');
      const cg = document.getElementById('choice-grid');
      console.log('[Final] spelling-area active?', sa.classList.contains('active'),
        '| computed opacity:', getComputedStyle(sa).opacity,
        '| choice-grid display:', getComputedStyle(cg).display);
    }

    let built = starter;
    
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];

      // 每步开始都显式确保拼写区可见、选项区未被隐藏
      this.showSpellingArea(true);
      document.getElementById('choice-grid').style.display = '';

      // Update built display
      const builtChars = document.getElementById('built-chars');
      builtChars.innerHTML = '';
      for (const ch of built) {
        const s = document.createElement('span');
        s.className = 'built-char';
        s.textContent = ch;
        builtChars.appendChild(s);
      }
      
      this.appendDialogLine('你的本能正在引导你……', 'warning');
      await this.sleep(500);
      
      // 显示正常汉字，权重100引导正确选项
      const grid = document.getElementById('choice-grid');
      grid.innerHTML = '';
      const sorted = this._sortChoices(step.choices);
      
      sorted.forEach(([char, data], idx) => {
        const weight = typeof data === 'object' && data !== null ? (data.weight || 50) : 50;
        const btn = document.createElement('button');
        btn.className = 'choice-btn';
        btn.innerHTML = `<div style="font-size:1.6rem">${char}</div><div class="choice-weight"><div class="choice-weight-bar" id="cwb-final-${idx}"></div></div>`;
        btn.onclick = () => {
          if (this._spellResolve) { this._spellResolve([char, data]); this._spellResolve = null; }
        };
        grid.appendChild(btn);
        setTimeout(() => {
          const el = document.getElementById(`cwb-final-${idx}`);
          if (el) el.style.width = weight + '%';
        }, 100);
      });
      
      const chosen = await new Promise(r => { this._spellResolve = r; });
      this._spellResolve = null;
      
      const [char, data] = chosen;
      
      // 选错时提供反馈并重试
      if (data.wrong) {
        this.appendDialogLine('关联错误——但你的本能知道正确答案。', 'error');
        await this._showGarbled(this.garbledTexts['default'] || []);
        this.appendDialogLine(this._getSigh(), '');
        this.appendDialogLine(step.wrong_feedback, 'warning');
        await this.sleep(1000);
        i--;
        continue;
      }
      
      built += char;
      
      // Update built display
      const builtChars2 = document.getElementById('built-chars');
      const newSpan = document.createElement('span');
      newSpan.className = 'built-char';
      newSpan.textContent = char;
      builtChars2.appendChild(newSpan);
      
      if (i < steps.length - 1) {
        this.appendDialogLine(`>> ${built}`, 'warning');
        await this.sleep(500);
      }
    }
    
    this.showSpellingArea(false);
    
    this.appendDialogLine('========================================', 'warning');
    this.appendDialogLine('核心关联验证通过', 'warning');
    this.appendDialogLine('========================================', 'warning');
    
    this.showChars(['char_linkeB']);
    await this.sleep(300);
    
    for (const line of (finalData.feedback || [])) {
      await this._typeDialogLine(line, '');
      await this.sleep(1000);
    }
    
    await this.sleep(1000);
  }
  
  // =====================================================
  // ENDINGS
  // =====================================================
  async _runEnding() {
    const ending = window.GAME_DATA.ACT3_ENDING;

    // 收尾终局拼字遗留：清空对话区/拼字区/人物，避免 ending-overlay
    // 淡出后露出 _runFinal 的 feedback 内容
    this.clearDialog();
    this.showSpellingArea(false);
    this.hideChars();

    // Hidden ending —— 带背景图叠化切换
    const overlay = document.getElementById('ending-overlay');
    overlay.className = 'hidden-end';
    overlay.classList.add('active');
    overlay.style.display = 'flex';

    // 背景图切换 helper：active 在 img_a/img_b 之间交替，实现叠化（CSS transition 1.2s）
    const setEndingBg = (key) => {
      const imgA = document.getElementById('ending-bg-a');
      const imgB = document.getElementById('ending-bg-b');
      if (!ASSETS[key]) return;
      // 当前 active 的 img 先失活，另一张设为新的 src 再 activate
      const aActive = imgA.classList.contains('active');
      if (aActive) {
        imgB.src = ASSETS[key];
        imgA.classList.remove('active');
        imgB.classList.add('active');
      } else {
        imgA.src = ASSETS[key];
        imgB.classList.remove('active');
        imgA.classList.add('active');
      }
    };

    // hidden1：一开始就出现
    setEndingBg('hidden1');
    const linesEl = document.getElementById('ending-lines');
    linesEl.innerHTML = '';

    for (const line of ending.hidden) {
      // 按文本匹配切换背景
      if (line === '  \"爸，我怕。\"') setEndingBg('hidden2');
      else if (line === '  \"可可不哭，爸爸教你。\"') setEndingBg('hidden3');
      else if (line === '  那天下午——') setEndingBg('hidden4');

      const d = document.createElement('div');
      d.className = 'ending-line';
      d.textContent = line;
      if (line.includes('————————————————')) d.style.borderTop = '1px solid rgba(212,165,116,0.3)';
      linesEl.appendChild(d);
      // Scroll: max 8 visible lines
      while (linesEl.children.length > 8) {
        linesEl.removeChild(linesEl.firstChild);
      }
      await this.sleep(100);
      d.classList.add('visible');
      await this.sleep(1000);
    }
    
    await this.sleep(2000);
    
    // Fade to black
    overlay.style.transition = 'opacity 2s ease';
    overlay.style.opacity = '0';
    await this.sleep(2000);
    overlay.classList.remove('active');
    overlay.style.display = 'none';
    overlay.style.opacity = '1';
    
    await this.sleep(500);
    
    // Standard ending
    overlay.className = 'standard-end';
    overlay.classList.add('active');
    overlay.style.display = 'flex';
    linesEl.innerHTML = '';
    
    for (const line of ending.standard) {
      const d = document.createElement('div');
      d.className = 'ending-line';
      if (line.includes('游戏结束')) d.className = 'ending-game-over ending-title';
      if (line.includes('————————————————')) d.style.borderTop = '1px solid rgba(212,165,116,0.3)';
      d.textContent = line;
      linesEl.appendChild(d);
      // Scroll: max 8 visible lines
      while (linesEl.children.length > 8) {
        linesEl.removeChild(linesEl.firstChild);
      }
      await this.sleep(100);
      d.classList.add('visible');
      await this.sleep(1200);
    }

    // standard 段播完后保持画面，不再淡出——由 _ACT3 立刻叠上 credits-overlay
    // （credits z-index 400 > ending 300，会完全遮住，避免 ending 淡出时露出底层）
    await this.sleep(1500);
  }
}

// ============================================================
// WEIGHT MATRIX
// ============================================================
class WeightMatrix {
  constructor() { this.weights = {}; }
  learn(a, b, w) { this.weights[[a,b].join('|')] = Math.min(w, 99); }
  strengthen(a, b, inc) { const k = [a,b].join('|'); this.weights[k] = Math.min((this.weights[k]||0)+inc, 99); }
  getWeight(a, b) { return this.weights[[a,b].join('|')] || 0; }
  decay() {
    for (const k of Object.keys(this.weights)) {
      if (Math.random() < 0.3) this.weights[k] = Math.max(this.weights[k] - 10, 10);
    }
  }
}

// ============================================================
// INIT
// ============================================================
window.game = new CiyuGame();
