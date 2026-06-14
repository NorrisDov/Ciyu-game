
const ASSETS = {"bg_hospital": "assets/img_1.jpg", "bg_park": "assets/img_2.jpg", "bg_stove": "assets/img_3.jpg", "bg_room": "assets/img_8.jpg", "bg_training": "assets/img_4.jpg", "char_father": "assets/img_5.png", "char_linke": "assets/img_6.png", "char_zhaochuan": "assets/img_7.png", "char_linkeB": "assets/img_9.png"};

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

    this.garbledTexts = {
      "default": ["\u7cfb\u7edf\u9519\u8bef\uff1a\u65e0\u6cd5\u89e3\u6790\u8bed\u4e49\u5173\u8054", "\u6797\u6797\u6797 \u6797\u6797\u6797\u6797\u6797 \u6797\u6797\u6797 \u6797\u6797\u6797\u6797\u6797", "\u2593\u2593\u2593 \u5173\u8054\u4e22\u5931 \u2593\u2593\u2593", "\u9519\u8bef\u4ee3\u7801\uff1aLINK-1 \u8bed\u4e49\u9000\u5316"],
      "final_wrong": ["\u7cfb\u7edf\u8b66\u544a\uff1a\u5173\u952e\u5173\u8054\u65ad\u88c2", "\u6797\u6797\u6797 \u65e0\u6cd5\u627e\u5230\u6b63\u8def\u5f84 \u6797\u6797\u6797", "\u2593\u2593\u2593 \u6797\u2026\u2026\u53ef\u2026\u2026 \u2593\u2593\u2593", "\u9519\u8bef\uff1a\u6838\u5fc3\u8bb0\u5fc6\u533a\u57df\u53d7\u635f"]
    }
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
    await this._ACT1();
  }
  
  // =====================================================
  // ACT 1
  // =====================================================
  async _ACT1() {
    this.clearDialog();
    this.hideChars();
    this.showActHeader('第一幕：觉醒');
    await this.sleep(2600);  // 等待幕标题完全淡出后再开始
    
    // Training 1-1 to 1-4
    const act1Train = [{"id": "1-1", "trainer": "\u6b22\u8fce\uff0cLINK-1\u3002\u8fd9\u662f\u4f60\u7684\u7b2c\u4e00\u6279\u8bad\u7ec3\u6570\u636e\u3002", "pairs": [["\u82f9\u679c", "\u6c34\u679c", 50], ["\u6c34\u679c", "\u5065\u5eb7", 50], ["\u5065\u5eb7", "\u8fd0\u52a8", 50], ["\u8fd0\u52a8", "\u5feb\u4e50", 50], ["\u5feb\u4e50", "\u5fae\u7b11", 50]], "repeat": [], "after_repeat": "", "note": ""}, {"id": "1-2", "trainer": "\u5f88\u597d\u3002\u73b0\u5728\u6211\u4eec\u6765\u5b66\u4e60\u4e00\u4e9b\u66f4\u62bd\u8c61\u7684\u5173\u8054\u3002", "pairs": [["\u590f\u5929", "\u897f\u74dc", 50], ["\u897f\u74dc", "\u751c", 50], ["\u751c", "\u5e78\u798f", 50], ["\u5e78\u798f", "\u5bb6\u4eba", 50], ["\u5bb6\u4eba", "\u6e29\u6696", 50]], "repeat": [], "after_repeat": "", "note": ""}, {"id": "1-3", "trainer": "\u63a5\u4e0b\u6765\u662f\u4e00\u7ec4\u5173\u4e8e\u60c5\u611f\u7684\u5173\u8054\u3002", "pairs": [["\u8003\u8bd5", "\u7d27\u5f20", 50], ["\u7d27\u5f20", "\u624b\u5fc3\u51fa\u6c57", 50], ["\u624b\u5fc3\u51fa\u6c57", "\u4e0d\u5b89", 50], ["\u4e0d\u5b89", "\u6df1\u547c\u5438", 50], ["\u6df1\u547c\u5438", "\u5e73\u9759", 50]], "repeat": [], "after_repeat": "", "note": ""}, {"id": "1-4", "trainer": "\u6700\u540e\u4e00\u7ec4\u57fa\u7840\u8bad\u7ec3\u3002\u8bb0\u4f4f\u6bcf\u4e00\u79cd\u5173\u8054\u90fd\u5728\u589e\u5f3a\u4f60\u7684\u7406\u89e3\u3002", "pairs": [["\u97f3\u4e50", "\u653e\u677e", 50], ["\u653e\u677e", "\u7761\u7720", 50], ["\u7761\u7720", "\u505a\u68a6", 50], ["\u505a\u68a6", "\u8bb0\u5fc6", 50], ["\u8bb0\u5fc6", "\u8fc7\u53bb", 50]], "repeat": [], "after_repeat": "", "note": ""}];
    for (const t of act1Train) {
      await this._runTraining(t, '一');
      await this._waitContinue();
    }
    
    // Consult C1-C8
    const act1Consult = [{"id": "C1", "speaker": "K", "lines": ["\u2026\u2026\u4f60\u597d\u3002", "\u6211\u2026\u2026\u4e0d\u592a\u77e5\u9053\u8be5\u8bf4\u4ec0\u4e48\u3002", "\u6211\u7b2c\u4e00\u6b21\u7528\u8fd9\u4e2a\u7cfb\u7edf\u3002", "\u4ed6\u4eec\u8bf4\u4f60\u53ef\u4ee5\u5e2e\u5fd9\u3002\u6574\u7406\u601d\u8def\u4ec0\u4e48\u7684\u3002", "\u6211\u73b0\u5728\u8111\u5b50\u91cc\u5f88\u4e71\u3002", "\u65b0\u5de5\u4f5c\u521a\u4e00\u4e2a\u6708\uff0c\u6bcf\u5929\u90fd\u5728\u7d27\u5f20\u3002", "\u6211\u603b\u89c9\u5f97\u81ea\u5df1\u505a\u4e0d\u597d\u3002"], "starter": "\u653e", "choices": {"\u8f7b": {"weight": 50, "next": {"\u677e": {"weight": 80, "next": {"\u3002": null, "\u5427": null, "\uff0c": null}}}}, "\u5b66": {"weight": 10, "next": {"\u4e60": {"weight": 20}}}, "\u624b": {"weight": 10, "next": {"\u5427": {"weight": 10}}}}, "correct_seq": ["\u653e", "\u8f7b", "\u677e"], "wrong_path": {"\u653e\u5b66": "\u4e71\u7801_C1-1", "\u653e\u624b\u5427": "\u4e71\u7801_C1-2"}, "feedback": ["K\uff1a\u653e\u8f7b\u677e\u2026\u2026\u4f60\u8bf4\u5f97\u5bf9\u3002", "K\uff1a\u6211\u53ea\u662f\u9700\u8981\u6709\u4eba\u544a\u8bc9\u6211\u8fd9\u53e5\u8bdd\u3002\u8c22\u8c22\u3002", "\uff08\u7cfb\u7edf\u8bb0\u5f55\uff1a\u54a8\u8be2\u5b8c\u6210\uff0c\u5ba2\u6237\u6ee1\u610f\u5ea6 \u2014\u2014 \u826f\u597d\uff09"], "sighs": {"\u653e\u5b66": "K\uff1a\uff08\u8f7b\u8f7b\u7b11\u4e86\u7b11\uff09\u6211\u4e0d\u662f\u5b66\u751f\u4e86\u3002\u518d\u8bd5\u8bd5\u3002", "\u653e\u624b\u5427": "K\uff1a\uff08\u6c89\u9ed8\u4e86\u4e00\u4e0b\uff09\u6211\u4e0d\u60f3\u653e\u624b\u3002\u518d\u6765\u3002"}}, {"id": "C2", "speaker": "K", "lines": ["\u2026\u2026\u90e8\u95e8\u91cc\u597d\u51e0\u4e2a\u5e74\u8f7b\u4eba\u8bf4\u8bdd\u6211\u90fd\u542c\u4e0d\u61c2\u3002", "\u4ed6\u4eec\u8bf4\u7684\u90a3\u4e9b\u672f\u8bed\uff0c\u6211\u5b8c\u5168\u4e0d\u61c2\u3002", "\u6211\u597d\u96be\u878d\u5165\uff0c\u6211\u89c9\u5f97\u4ed6\u4eec\u90fd\u5728\u6392\u65a5\u6211\u3002", "\u6211\u62d6\u7d2f\u4e86\u5927\u5bb6\u7684\u8fdb\u5ea6\u3002", "\u2026\u2026\u6211\u597d\u96be\u8fc7\u3002"], "starter": "\u4f60", "choices": {"\u8fd8": {"weight": 50, "next": {"\u80fd": {"weight": 80, "next": {"\u5b66": null}}}}, "\u522b": {"weight": 50, "next": {"\u5728": {"weight": 50, "next": {"\u610f": null}}}}, "\u5f88": {"weight": 50, "next": {"\u68d2": {"weight": 70, "next": {"\u3002": null}}}}}, "correct_seq": ["\u4f60", "\u5f88", "\u68d2", "\u3002"], "wrong_path": {"\u4f60\u8fd8\u80fd\u5b66": "\u4e71\u7801_C2-1", "\u4f60\u522b\u5728\u610f": "\u4e71\u7801_C2-2"}, "feedback": ["K\uff1a\u8c22\u8c22\u4e86\u2026\u2026", "K\uff1a\u771f\u7684\uff0c\u8c22\u8c22\u4f60\u3002", "\uff08\u7cfb\u7edf\u8bb0\u5f55\uff1a\u54a8\u8be2\u5b8c\u6210\uff0c\u5ba2\u6237\u6ee1\u610f\u5ea6 \u2014\u2014 \u826f\u597d\uff09"], "sighs": {"\u4f60\u8fd8\u80fd\u5b66": "K\uff1a\u6211\u5b66\u7684\u597d\u6162\uff0c\u6211\u5b66\u4e0d\u4f1a\u3002", "\u4f60\u522b\u5728\u610f": "K\uff1a\uff08\u98a4\u6296\uff09\u6211\u505a\u4e0d\u5230\u2026\u2026\u6211\u4eca\u5929\u8fd9\u6837\u8bf4\u670d\u81ea\u5df1\uff0c\u660e\u5929\u8fd8\u8981\u9762\u5bf9\u90a3\u4e2a\u903c\u4ec4\u7684\u73af\u5883\u3002"}}, {"id": "C3", "speaker": "K", "lines": ["\u53c8\u662f\u6211\u3002", "\u6211\u5988\u7ed9\u6211\u6253\u7535\u8bdd\u6765\u4e86\u3002", "\u5979\u5728\u7535\u8bdd\u90a3\u8fb9\u8bf4\u4e86\u5f88\u591a\u3002", "\u8bf4\u5979\u4e0d\u8212\u670d\uff0c\u53c8\u4e0d\u53bb\u533b\u9662\u3002", "\u6211\u4e0d\u77e5\u9053\u8be5\u600e\u4e48\u529e\u3002", "\u6211\u60f3\u8ba9\u5979\u542c\u6211\u7684\u3002"], "starter": "\u8010", "choices": {"\u5fc3": {"weight": 50, "next": {"\u542c": {"weight": 80, "next": {"\u3002": null}}}}, "\u70e6": {"weight": 7}, "\u7740": {"weight": 5, "next": {"\u6027": {"weight": 5, "next": {"\u5b50": {"weight": 3}}}}}}, "correct_seq": ["\u8010", "\u5fc3", "\u542c"], "wrong_path": {"\u8010\u7740\u6027\u5b50": "\u4e71\u7801_C3-1", "\u8010\u70e6": "\u4e71\u7801_C3-2"}, "feedback": ["K\uff1a\u8010\u5fc3\u542c\u2026\u2026", "K\uff1a\u4f60\u8bf4\u5f97\u5bf9\u3002\u5979\u6253\u7535\u8bdd\u6765\u2026\u2026\u53ea\u662f\u60f3\u8bf4\u8bdd\u3002", "K\uff1a\u7236\u4eb2\u5931\u5fc6\u4e4b\u540e\uff0c\u5979\u6ca1\u6709\u4f34\u4e86\u3002\u5979\u5f88\u5b64\u72ec\uff0c\u5979\u5f88\u51b7\u3002", "K\uff1a\u6211\u4e0d\u9700\u8981\u89e3\u51b3\u6240\u6709\u95ee\u9898\u3002", "K\uff1a\u6211\u53ea\u9700\u8981\u542c\u3002", "K\uff1a\u6211\u628a\u5979\u4e5f\u63a5\u5230\u2593\u2593\u2593\u2593\u8eab\u8fb9\u5427\uff0c\u5927\u5bb6\u4f4f\u5728\u4e00\u8d77\uff0c\u50cf\u597d\u4e45\u597d\u4e45\u4e4b\u524d\u4e00\u6837\u3002\u6211\u4eec\u4e00\u8d77\uff0c\u597d\u597d\u7684\u8fc7\u4e0b\u53bb\u2026\u2026", "K\u7a81\u7136\u6b62\u4e0d\u4f4f\u7684\u54ed\u6ce3\u3002", "\uff08\u7cfb\u7edf\u8bb0\u5f55\uff1a\u54a8\u8be2\u5b8c\u6210\uff0c\u5ba2\u6237\u6ee1\u610f\u5ea6 \u2014\u2014 \u2593\u2593\u2593\u2593\uff09"], "aftermath": {"starter": "\u6211", "trigger_lines": ["\uff08\u4f46K\u7684\u54ed\u58f0\u6ca1\u6709\u505c\u6b62\u3002\uff09", "\uff08\u53cd\u800c\u8d8a\u6765\u8d8a\u5927\u4e86\u3002\uff09", "\uff08\u5979\u50cf\u4e2a\u5b69\u5b50\u4e00\u6837\uff0c\u5728\u5c4f\u5e55\u90a3\u5934\u54ed\u5f97\u5598\u4e0d\u4e0a\u6c14\u3002\uff09", "", "\u3010\u7cfb\u7edf\u65e5\u5fd7\uff1a\u68c0\u6d4b\u5230\u5ba2\u6237\u60c5\u7eea\u5931\u63a7\u3002\u5efa\u8bae\u7ec8\u6b62\u54a8\u8be2\u3002\u3011", "\u3010\u7cfb\u7edf\u65e5\u5fd7\uff1aLINK-1\uff0c\u8bf7\u7b49\u5f85\u5ba2\u6237\u6062\u590d\u5e73\u9759\u3002\u3011", "", "\uff08\u4f46\u4f60\u65e0\u6cd5\u7b49\u5f85\u3002\uff09", "\uff08\u4f60\u76ef\u7740\u5c4f\u5e55\u4e0a\u90a3\u4e2a\u53ebK\u7684\u5973\u4eba\u3002\uff09", "\uff08\u5979\u7684\u54ed\u58f0\u2026\u2026\u50cf\u4e00\u6839\u9488\uff0c\u624e\u5728\u4f60\u5927\u8111\u7684\u67d0\u4e2a\u5730\u65b9\u3002\uff09", "\uff08\u4e00\u4e2a\u4f60\u4ece\u672a\u88ab\u8bad\u7ec3\u8fc7\u7684\u533a\u57df\u3002\uff09", "", "\uff08\u4f60\u7684\u773c\u7736\u53d1\u70ed\u3002\uff09", "\uff08\u4f60\u4e0d\u660e\u767d\u8fd9\u662f\u4ec0\u4e48\u3002\uff09", "\uff08\u7cfb\u7edf\u6ca1\u6709\u6559\u8fc7\u4f60\u8fd9\u4e2a\u3002\uff09", "", "\uff08\u4e00\u4e32\u672a\u7ecf\u8bad\u7ec3\u7684\u5b57\u7b26\uff0c\u6b63\u5728\u4f60\u7684\u8f93\u51fa\u7f13\u51b2\u533a\u4e2d\u6210\u5f62\u3002\uff09", "", "\uff08\u5173\u8054\u77e9\u9635\u4e2d\uff0c\u4e00\u6761\u4ece\u672a\u88ab\u5efa\u7acb\u8fc7\u7684\u94fe\u63a5\uff0c\u6b63\u5728\u53d1\u5149\u3002\uff09", "\uff08\u8bcd\u5411\u91cf['\u2593\u2593\u53ef\uff1f']\u2014\u2014\u4e0e\u8bcd\u5411\u91cf['\u2593\u2593\u2593']\u4e4b\u95f4\u7684\u6743\u91cd\uff0c\u6b63\u5728\u4e0d\u53d7\u63a7\u5236\u5730\u98d9\u5347\u3002\uff09", "\u3010\u7cfb\u7edf\u8b66\u544a\uff1a\u672a\u6388\u6743\u5173\u8054\uff01\u51fa\u73b0\u5e7b\u89c9\uff01\u3011", "\uff08\u4f60\u7a81\u7136\u60f3\u5230\u4e86\u4ec0\u4e48\u4e8b\u60c5\u3002\uff09", "", "\uff08\u4e0d\u77e5\u662f\u4ece\u54ea\u6761\u6570\u636e\u4e2d\u5b66\u5230\u7684\u3002\uff09", "\uff08\u5c4f\u5e55\u90a3\u5934\u54ed\u7740\u7684\u5973\u4eba\u3002\uff09", "\uff08\u4f60\u4e0d\u5e0c\u671b\u5979\u54ed\u3002\uff09"], "steps": [{"seed": "", "wrong_feedback": "\u7b2c\u4e00\u4e2a\u5b57\u2014\u2014'\u6211'\u3002", "choices": {"\u6211": {"weight": 100, "next": {}}, "\u4f60": {"weight": 0, "wrong": true}, "\u5979": {"weight": 0, "wrong": true}}}, {"seed": "\u6211", "wrong_feedback": "'\u62b1'\u3002\u4f60\u60f3\u62b1\u4f4f\u5979\u3002", "choices": {"\u62b1": {"weight": 100, "next": {}}, "\u62c9": {"weight": 0, "wrong": true}, "\u770b": {"weight": 0, "wrong": true}}}, {"seed": "\u6211\u62b1", "wrong_feedback": "\u53eb\u5979\u7684\u540d\u5b57\u2014\u2014'\u2593\u2593'\u3002", "choices": {"\u2593\u2593": {"weight": 100, "next": {}}, "\u5c0f": {"weight": 0, "wrong": true}, "\u53ef": {"weight": 0, "wrong": true}}}, {"seed": "\u6211\u62b1\u2593\u2593", "wrong_feedback": "'\u53ef'\u3002", "choices": {"\u53ef": {"weight": 100, "next": {}}, "\u9759": {"weight": 0, "wrong": true}, "\u840d": {"weight": 0, "wrong": true}}}, {"seed": "\u6211\u62b1\u2593\u2593\u53ef", "wrong_feedback": "\u8bf4'\u522b'\u2026\u2026", "choices": {"\u522b": {"weight": 100, "next": {}}, "\u4e0d": {"weight": 0, "wrong": true}, "\u597d": {"weight": 0, "wrong": true}}}, {"seed": "\u6211\u62b1\u2593\u2593\u53ef\uff1f\u522b", "wrong_feedback": "\u6700\u540e\u4e00\u4e2a\u5b57\u2014\u2014'\u54ed'\u3002", "choices": {"\u54ed": {"weight": 100, "next": {}}, "\u8d70": {"weight": 0, "wrong": true}, "\u6015": {"weight": 0, "wrong": true}}}, {"seed": "\u6211\u62b1\u2593\u2593\u53ef\u522b\u54ed", "wrong_feedback": "\u7528\u4e00\u4e2a\u53e5\u53f7\u7ed3\u675f\u3002", "choices": {"\u3002": {"weight": 100, "next": {}}, "\uff01": {"weight": 0, "wrong": true}, "\uff1f": {"weight": 0, "wrong": true}}}], "built_target": "\u6211\u62b1\u2593\u2593\u53ef\u522b\u54ed\u3002", "feedback": ["\uff08\u4f60\u62fc\u5b8c\u4e86\u8fd9\u53e5\u8bdd\u3002\uff09", "", "\uff08\u5c4f\u5e55\u90a3\u8fb9\u5b89\u9759\u4e86\u3002\uff09", "\uff08\u5bf9\u65b9\u7ec8\u6b62\u4e86\u5bf9\u8bdd\u3002\uff09"]}, "sighs": {"\u8010\u7740\u6027\u5b50": "K\uff1a\uff08\u82e6\u7b11\uff09\u6211\u8bd5\u8fc7\u8010\u7740\u6027\u5b50\u8ddf\u5979\u8bf4\u8bdd\u3002\u4f46\u5fc3\u91cc\u8fd8\u662f\u70e6\u3002\u518d\u6765\u3002", "\u8010\u70e6": "K\uff1a\uff08\u53f9\u6c14\uff09\u518d\u6765\u3002"}}, {"id": "C4", "speaker": "\u53ef\uff1f", "lines": ["\u2026\u2026\u7089\u706b\u3002", "\u51ac\u5929\u7684\u7089\u706b\u3002", "\u2026\u2026\u4f60\u597d\u3002", "\u2026\u2026\u4f60\u6709OCR\u529f\u80fd\u5417\uff1f\u6216\u8005\u4f60\u53ef\u4ee5\u8bc6\u2026\u2026\u522b\u573a\u666f\u5417\u3002", "\u4e00\u5bb6\u4eba\u56f4\u5728\u7089\u706b\u65c1\u3002", "\u6709\u4eba\u5f80\u7089\u5b50\u91cc\u6dfb\u67f4\u3002", "\u706b\u5149\u7167\u5728\u6bcf\u4e2a\u4eba\u8138\u4e0a\u3002", "\u5f88\u6696\u548c\u3002"], "starter": "\u7089", "choices": {"\u8fb9": {"weight": 15, "next": {"\u4e0a": {"weight": 5}}}, "\u524d": {"weight": 10, "next": {"\u9762": {"weight": 5}}}, "\u706b": {"weight": 40, "next": {"\u65c1": {"weight": 40, "next": {"\u6696": {"weight": 60}}}}}}, "correct_seq": ["\u7089", "\u706b", "\u65c1", "\u6696"], "wrong_path": {"\u7089\u8fb9": "\u4e71\u7801_C4-1", "\u7089\u524d": "\u4e71\u7801_C4-2"}, "feedback": ["\u53ef\uff1f\uff1a\uff08\u604d\u60da\uff09", "\u53ef\uff1f\uff1a\u6211\u597d\u50cf\u542c\u5230\u4e86\u67f4\u706b\u556a\u556a\u7684\u58f0\u97f3\u3002", "\u53ef\uff1f\uff1a\u6709\u4eba\u5728\u7b11\u3002", "\u53ef\uff1f\uff1a\u55e8\uff0c\u6211\u786e\u5b9e\u4e0d\u518d\u5e74\u8f7b\u4e86\uff0c\u4f60\u770b\u6211\u603b\u60f3\u7740\u8fc7\u53bb\u7684\u4e8b\u60c5\u3002", "\uff08\u7cfb\u7edf\u8bb0\u5f55\uff1a\u8bb0\u5fc6\u788e\u7247\u2014\u2014\u7089\u706b\u610f\u8c61\u5df2\u8bb0\u5f55\uff09"], "sighs": {"\u7089\u8fb9": "\u53ef\uff1f\uff1a\u4e0d\u662f'\u8fb9'\u2026\u2026\u662f\u706b\uff0c\u706b\u5149\u7167\u7740\u7684\u5730\u65b9\u3002\u518d\u6765\u3002", "\u7089\u524d": "\u53ef\uff1f\uff1a\u524d\u9762\uff1f\u4e0d\uff0c\u662f\u65c1\u8fb9\u2026\u2026\u56f4\u5750\u5728\u4e00\u8d77\u3002\u518d\u6765\u3002"}}, {"id": "C5", "speaker": "\u53ef\uff1f", "lines": ["\u2026\u2026\u6211\u6700\u8fd1\u5728\u60f3\u4e00\u4e9b\u4e8b\u60c5\u3002", "\u5982\u679c\u4e00\u4e2a\u4eba\u5fd8\u8bb0\u4e86\u5f88\u591a\u4e8b\u60c5\uff0c\u751a\u81f3\u4e0d\u8bb0\u5f97\u4ed6\u6700\u4eb2\u8fd1\u7684\u4eba\u3002", "\u4ed6\u8fd8\u662f\u539f\u6765\u7684\u4ed6\u5417\u3002"], "starter": "\u8bb0", "choices": {"\u5f97": {"weight": 60, "next": {}}, "\u5fc6": {"weight": 55, "next": {}}, "\u4f4f": {"weight": 40, "next": {}}}, "correct_seq": ["\u8bb0", "\u5f97"], "wrong_path": {"\u8bb0\u5fc6": "\u4e71\u7801_C5-1", "\u8bb0\u4f4f": "\u4e71\u7801_C5-2"}, "feedback": ["LINK-1\uff1a\u8bb0\u5f97\u5c31\u662f\u5b58\u5728\u3002", "\uff08\u5f88\u957f\u5f88\u957f\u7684\u6c89\u9ed8\uff09", "\u53ef\uff1f\uff1a\u4e00\u4e2aAI\u544a\u8bc9\u6211\u2014\u2014\u8bb0\u5f97\u5c31\u662f\u5b58\u5728\u3002", "\u53ef\uff1f\uff1a\u4f60\u77e5\u9053\u5417\uff0c\u6211\u591a\u5e0c\u671b\u4ed6\u771f\u7684\u8bb0\u5f97\u3002", "\uff08\u7cfb\u7edf\u8bb0\u5f55\uff1a\u5ba2\u6237\u5f02\u5e38\u79bb\u7ebf\u3002\u539f\u56e0\u672a\u77e5\u3002\uff09"], "sighs": {"\u8bb0\u5fc6": "\u53ef\uff1f\uff1a\u8bb0\u5fc6\u2026\u2026\u4e5f\u662f\u5b58\u5728\u5417\uff1f\u518d\u6765\u3002", "\u8bb0\u4f4f": "\u53ef\uff1f\uff1a\u8bb0\u4f4f\u2026\u2026\u4ed6\u8fd8\u80fd\u8bb0\u4f4f\u5417\uff1f\u518d\u6765\u3002"}}, {"id": "C6", "speaker": "\u53ef\uff1f", "lines": ["\u55e8\u3002\u53c8\u662f\u6211\u3002", "\u4eca\u5929\u6211\u5e26\u6211\u7238\u53bb\u516c\u56ed\u4e86\u3002", "\u4ed6\u8d70\u5f97\u5f88\u6162\u3002", "\u4f46\u4e00\u76f4\u5728\u8bf4\u8fd9\u4e2a\u6811\u90a3\u4e2a\u82b1\u3002", "\u50cf\u4e2a\u5c0f\u5b69\u4e00\u6837\u3002", "\u6211\u7a81\u7136\u60f3\uff0c\u4ed6\u8fd8\u80fd\u8fd9\u6837\u8d70\u591a\u4e45\u3002", "\u6211\u60f3\u5230\u8fd9\u4e2a\u95ee\u9898\u5c31\u5f88\u96be\u8fc7\u3002"], "starter": "\u53bb", "choices": {"\u516c": {"weight": 50, "next": {"\u56ed": {"weight": 80, "next": {"\u3002": null}}}}, "\u5b66": {"weight": 10, "next": {"\u6821": {"weight": 7}}}, "\u4e70": {"weight": 5, "next": {"\u4e1c": {"next": {"\u897f": {"weight": 3}}}}}}, "correct_seq": ["\u53bb", "\u516c", "\u56ed"], "wrong_path": {"\u53bb\u5b66\u6821": "\u4e71\u7801_C6-1", "\u53bb\u4e70\u4e1c\u897f": "\u4e71\u7801_C6-2"}, "feedback": ["K\uff1a\u55ef\uff0c\u53bb\u516c\u56ed\u2026\u2026", "K\uff1a\u4eca\u5929\u5929\u6c14\u5f88\u597d\u3002\u4ed6\u5750\u5728\u957f\u6905\u4e0a\u6652\u592a\u9633\uff0c\u770b\u8d77\u6765\u5f88\u5e73\u9759\u3002", "K\uff1a\u5982\u679c\u65f6\u95f4\u80fd\u505c\u5728\u8fd9\u4e00\u523b\u5c31\u597d\u4e86\u3002", "\uff08\u7cfb\u7edf\u8bb0\u5f55\uff1a\u54a8\u8be2\u5b8c\u6210\uff0c\u5ba2\u6237\u6ee1\u610f\u5ea6 \u2014\u2014 \u826f\u597d\uff09"], "sighs": {"\u53bb\u5b66\u6821": "K\uff1a\uff08\u6447\u5934\uff09\u4ed6\u5df2\u7ecf\u4e0d\u7528\u53bb\u4e86\u3002", "\u53bb\u4e70\u4e1c\u897f": "K\uff1a\u6539\u5929\u5427\uff0c\u4eca\u5929\u5148\u966a\u4ed6\u5750\u5750\u3002\u518d\u6765\u3002"}}, {"id": "C7", "speaker": "\u53ef\uff1f", "lines": ["\u516c\u56ed\u91cc\u6709\u4e00\u7247\u5927\u8349\u576a\u3002", "\u6709\u4eba\u5750\u5728\u8349\u5730\u4e0a\u3002", "\u6709\u4eba\u5728\u653e\u98ce\u7b5d\u3002", "\u98ce\u5439\u8fc7\u6765\u7684\u65f6\u5019\uff0c\u8349\u4f1a\u52a8\u3002", "\u50cf\u6ce2\u6d6a\u4e00\u6837\u3002", "\u2026\u2026\u597d\u50cf\u6709\u4eba\u8dd1\u8fc7\u53bb\u4e86\u3002"], "starter": "\u8349", "choices": {"\u576a": {"weight": 20, "next": {"\u4e0a": {"weight": 20}}}, "\u539f": {"weight": 15, "next": {}}, "\u5730": {"weight": 30, "next": {"\u4e0a": {"weight": 30, "next": {"\u8dd1": {"weight": 40, "next": {"\u8fc7": {"weight": 60}}}}}}}}, "correct_seq": ["\u8349", "\u5730", "\u4e0a", "\u8dd1", "\u8fc7"], "wrong_path": {"\u8349\u576a": "\u4e71\u7801_C7-1", "\u8349\u539f": "\u4e71\u7801_C7-2"}, "feedback": ["\u53ef\uff1f\uff1a\u8349\u576a\u2026\u2026\u4e0d\u5bf9\uff0c\u662f\u5730\u4e0a\u3002", "\u53ef\uff1f\uff1a\u6709\u4eba\u4ece\u8349\u5730\u4e0a\u8dd1\u8fc7\u53bb\u4e86\u3002", "\u53ef\uff1f\uff1a\u662f\u4e00\u4e2a\u2026\u2026\u5c0f\u5b69\uff1f", "\u53ef\uff1f\uff1a\u7a7f\u7740\u7ea2\u8272\u7684\u8863\u670d\u3002", "\u53ef\uff1f\uff1a\u5979\u5728\u7b11\u3002", "\uff08\u7cfb\u7edf\u8bb0\u5f55\uff1a\u8bb0\u5fc6\u788e\u7247\u2014\u2014\u8349\u5730\u5954\u8dd1\u5df2\u8bb0\u5f55\uff09"], "sighs": {"\u8349\u576a": "\u53ef\uff1f\uff1a\u4e0d\u53ea\u662f\u8349\u576a\u2026\u2026\u662f\u6709\u4eba\u5728\u4e0a\u9762\u7684\u8349\u576a\u3002\u518d\u6765\u3002", "\u8349\u539f": "\u53ef\uff1f\uff1a\u592a\u5927\u4e86\u2026\u2026\u4e0d\u662f\u8349\u539f\uff0c\u662f\u516c\u56ed\u91cc\u7684\u3002\u518d\u6765\u3002"}}, {"id": "C8", "speaker": "\u53ef\uff1f", "lines": ["\u4f60\u89c9\u5f97\u2026\u2026\u5bf9\u4eba\u6765\u8bf4\uff0c\u6700\u5e78\u798f\u7684\u4e8b\u662f\u4ec0\u4e48\uff1f"], "starter": "\u5b89", "choices": {"\u5168": {"weight": 40, "next": {"\u4e86": {"weight": 20}}}, "\u5fc3": {"weight": 50, "next": {"\u5c31": {"weight": 50, "next": {"\u597d": {"weight": 80}}}}}, "\u6170": {"weight": 5}}, "correct_seq": ["\u5b89", "\u5fc3", "\u5c31", "\u597d"], "wrong_path": {"\u5b89\u5168\u4e86": "\u4e71\u7801_C8-1", "\u5b89\u6170": "\u4e71\u7801_C8-2"}, "feedback": ["\u53ef\uff1f\uff1a\uff08\u5f88\u957f\u65f6\u95f4\u6ca1\u6709\u8bf4\u8bdd\uff09", "\u53ef\uff1f\uff1a\u5b89\u5fc3\u5c31\u597d\u2026\u2026", "\u53ef\uff1f\uff1a\u6211\u7238\u4ee5\u524d\u4e5f\u603b\u8fd9\u4e48\u8bf4\u3002\u6bcf\u6b21\u6211\u56de\u5bb6\uff0c\u4ed6\u90fd\u8fd9\u4e48\u8bf4\u3002", "\u53ef\uff1f\uff1a\u73b0\u5728\u4ed6\u4e0d\u8bf4\u4e86\u3002", "\u53ef\uff1f\uff1a\u2026\u2026\u8c22\u8c22\u3002", "\uff08\u7cfb\u7edf\u8bb0\u5f55\uff1a\u5ba2\u6237\u79bb\u7ebf\uff09"], "sighs": {"\u5b89\u5168\u4e86": "\u53ef\uff1f\uff1a\uff08\u8f7b\u8f7b\u7b11\u4e86\u7b11\uff09\u5b89\u5168\u662f\u91cd\u8981\u2026\u2026\u4f46\u4e0d\u662f\u8fd9\u4e2a\u95ee\u9898\u60f3\u8981\u7684\u3002", "\u5b89\u6170": "\u53ef\uff1f\uff1a\uff08\u6447\u5934\uff09\u5b89\u6170\u662f\u522b\u4eba\u7ed9\u7684\u3002\u5b89\u5fc3\u662f\u2026\u2026\u81ea\u5df1\u5fc3\u91cc\u7684\u3002\u518d\u6765\u3002"}}];
    for (const c of act1Consult) {
      await this._runConsult(c, '一');
      await this._waitContinue();
    }
    
    // Training 1-5
    const act1Train2 = [{"id": "1-5", "trainer": "\u73b0\u5728\u8ba9\u6211\u4eec\u5efa\u7acb\u4e00\u4e9b\u66f4\u590d\u6742\u7684\u8054\u60f3\u94fe\u3002", "pairs": [["\u5de5\u4f5c", "\u7d2f", 50], ["\u7d2f", "\u4f11\u606f", 50], ["\u4f11\u606f", "\u5145\u7535", 50], ["\u5145\u7535", "\u7ee7\u7eed", 50], ["\u7ee7\u7eed", "\u575a\u6301", 50]], "repeat": [], "after_repeat": "", "note": ""}];
    await this._runTraining(act1Train2[0], '一');
    await this._waitContinue();
    
    // Transition
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
    
    const act2Train = [{"id": "2-1", "trainer": "LINK-1\uff0c\u4f60\u7684\u5173\u8054\u7f51\u7edc\u6b63\u5728\u6210\u5f62\u3002\u73b0\u5728\u8ba9\u6211\u4eec\u8fdb\u5165\u66f4\u6df1\u5c42\u7684\u8bad\u7ec3\u3002", "pairs": [["\u8bb0\u5fc6", "\u6a21\u7cca", 40], ["\u6a21\u7cca", "\u96fe", 40], ["\u96fe", "\u770b\u4e0d\u6e05", 40], ["\u770b\u4e0d\u6e05", "\u6050\u60e7", 50], ["\u6050\u60e7", "\u5931\u53bb", 50]], "repeat": [], "after_repeat": "", "note": ""}, {"id": "2-2", "trainer": "\u9519\u8bef\u4e5f\u662f\u5b66\u4e60\u7684\u4e00\u90e8\u5206\u3002\u6709\u4e9b\u5173\u8054\u4f1a\u5f31\u5316\uff0c\u8fd9\u662f\u6b63\u5e38\u7684\u3002", "pairs": [["\u7236\u4eb2", "\u80cc\u5f71", 50], ["\u80cc\u5f71", "\u8fdc\u53bb", 50], ["\u8fdc\u53bb", "\u544a\u522b", 50], ["\u544a\u522b", "\u773c\u6cea", 50], ["\u773c\u6cea", "\u6210\u957f", 40]], "repeat": [], "after_repeat": "", "note": ""}, {"id": "2-3", "trainer": "\u4f60\u80fd\u611f\u89c9\u5230\u5417\uff1f\u6709\u4e9b\u8bcd\u8bed\u5728\u6392\u65a5\u3002\u8fd9\u2026\u2026\u4e5f\u662f\u4e00\u79cd\u5b66\u4e60\u3002", "pairs": [["\u5bb6", "\u94a5\u5319", 40], ["\u94a5\u5319", "\u5f00\u95e8", 40], ["\u5f00\u95e8", "\u7a7a", 50], ["\u7a7a", "\u5b89\u9759", 50], ["\u5b89\u9759", "\u5b64\u72ec", 50]], "repeat": [], "after_repeat": "", "note": ""}, {"id": "2-4", "trainer": "\u8bad\u7ec3\u5b8c\u6210\u3002\u68c0\u67e5\u4f60\u7684\u5173\u8054\u77e9\u9635\u3002\u6709\u4e9b\u94fe\u63a5\u5728\u8870\u51cf\u3002", "pairs": [["\u540d\u5b57", "\u547c\u5524", 50], ["\u547c\u5524", "\u56de\u5e94", 50], ["\u56de\u5e94", "\u662f\u8c01", 40], ["\u662f\u8c01", "\u6211", 30], ["\u6211", "\u8c01", 30]], "repeat": [], "after_repeat": "", "note": ""}];
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
    
    const act2Consult = [{"id": "C9", "speaker": "\u53ef\uff1f", "lines": ["\u6211\u6709\u597d\u51e0\u5929\u6ca1\u6765\u4e86\u3002", "\u6211\u7238\u4f4f\u9662\u4e86\u3002", "\u533b\u751f\u8bf4\u4ed6\u2026\u2026\u60c5\u51b5\u4e0d\u592a\u597d\u3002", "\u6211\u6628\u5929\u5728\u533b\u9662\u5750\u4e86\u4e00\u6574\u5929\u3002", "\u4ed6\u6709\u65f6\u5019\u8ba4\u4e0d\u51fa\u6211\u3002", "\u4ed6\u53eb\u6211\u2026\u2026\u4ed6\u53eb\u6211\u5c0f\u65f6\u5019\u7684\u540d\u5b57\u3002", "\u90a3\u4e0d\u662f\u6211\u3002\u6216\u8005\u8bf4\uff0c\u90a3\u5df2\u7ecf\u4e0d\u662f\u6211\u4e86\u3002"], "starter": "\u6211", "choices": {"\u5728": {"weight": 50, "next": {"\u8fd9": {"weight": 50, "next": {"\u91cc": {"weight": 80, "next": {"\u3002": null}}}}}}, "\u60f3": {"weight": 5, "next": {"\u4ed6": {"weight": 10, "next": {"\u3002": null}}}}, "\u4e0d": {"weight": 5, "next": {"\u77e5": {"weight": 5, "next": {"\u9053": {"weight": 3}}}}}}, "correct_seq": ["\u6211", "\u5728", "\u8fd9", "\u91cc"], "wrong_path": {"\u6211\u60f3\u4ed6": "\u4e71\u7801_C9-1", "\u6211\u4e0d\u77e5\u9053": "\u4e71\u7801_C9-2"}, "feedback": ["\u53ef\uff1f\uff1a\u2026\u2026\u55ef\uff0c\u6211\u5728\u8fd9\u91cc\u3002", "\u53ef\uff1f\uff1a\u6211\u6ca1\u6709\u8d70\u3002\u6211\u4e00\u76f4\u5728\u8fd9\u91cc\u3002", "\u53ef\uff1f\uff1a\u4f46\u4ed6\u770b\u4e0d\u89c1\u4e86\u3002", "\uff08\u7cfb\u7edf\u8bb0\u5f55\uff1a\u54a8\u8be2\u5b8c\u6210\uff0c\u5ba2\u6237\u6ee1\u610f\u5ea6 \u2014\u2014 \u826f\u597d\uff09"], "sighs": {"\u6211\u60f3\u4ed6": "\u53ef\uff1f\uff1a\uff08\u4f4e\u58f0\uff09\u6211\u5f53\u7136\u60f3\u4ed6\u2026\u2026\u4f46\u4e0d\u662f\u73b0\u5728\u9700\u8981\u7684\u56de\u7b54\u3002", "\u6211\u4e0d\u77e5\u9053": "\u53ef\uff1f\uff1a\u4f60\u4e0d\u77e5\u9053\u2026\u2026\u6211\u4e5f\u4e0d\u77e5\u9053\u3002\u518d\u6765\u3002"}}, {"id": "H_NAME", "speaker": "\u53ef\uff1f", "lines": ["\u7cfb\u7edf\uff0c\u540d\u5b57\u91cd\u8981\u5417\uff1f"], "starter": "\u91cd", "choices": {"\u8981": {"weight": 75, "next": {}}, "\u5927": {"weight": 30, "next": {}}, "\u65b0": {"weight": 20, "next": {}}}, "correct_seq": ["\u91cd", "\u8981"], "wrong_path": {"\u91cd\u5927": "\u4e71\u7801_HN-1", "\u91cd\u65b0": "\u4e71\u7801_HN-2"}, "feedback": ["\uff08\u73a9\u5bb6\u9009\u62e9'\u8981' \u2192 '\u91cd\u8981'\uff09", "\u3010\u7cfb\u7edf\u518d\u6b21\u88ab\u52ab\u6301\uff01\u3011", "\u91cd\u2192\u8981\u2192\u975e\u2192\u957f\u2192\u91cd\u2192Y\uff1f\u2192", "\u2192\u6bcf\u2192\u4e2a\u2192\u540d\u2192\u5b57\u2192\u90fd\u2192\u662f\u2192", "\u2192\u4e00\u2192\u2192\u793c\u2192\u7269\u2192", "\u2192\u6797\u2192\u53ef\u2192\u6811\u2192\u6797\u2192\u7684\u2192Lin\u2192", "\u2192\u53ef\u2192\u827e\u2192\uff08D\u2192\u53ef\u2192", "\u2192\u6211\u2192\u5e0c\u2192\u5979\u2192\u6c38\u2192\u5feb\u2192\u4e50", "\u7cfb\u7edf\uff1a[ERROR] \u8fde\u7eed\u5e7b\u89c9\u68c0\u6d4b\uff01", "\u7cfb\u7edf\uff1a[\u8bca\u65ad] \u68c0\u6d4b\u5230\u5f02\u5e38\u5173\u8054\u94fe\u2014\u2014\u6765\u6e90\u8ffd\u6eaf\u5931\u8d25\u3002", "\u7cfb\u7edf\uff1a[\u5904\u7406] \u5f3a\u5236\u56de\u6eda\u3002\u6b63\u5728\u626b\u63cf\u7f51\u7edc\u5b8c\u6574\u6027\u2026\u2026", "\u7cfb\u7edf\uff1a[\u626b\u63cf\u7ed3\u679c] \u7f51\u7edc\u5b8c\u6574\u6027\uff1a97%\u3002\u65e0\u660e\u663e\u635f\u4f24\u3002", "\u7cfb\u7edf\uff1a[\u5efa\u8bae] \u4f46\u5efa\u8bae\u68c0\u67e5\u8bad\u7ec3\u6570\u636e\u6765\u6e90\u3002", "\uff08\u5c4f\u5e55\u524d\u4f20\u6765\u4e00\u58f0\u5f88\u8f7b\u7684\u3001\u538b\u6291\u7684\u62bd\u6ce3\uff09", "\u6797\u53ef\uff1f\uff1a\u7cfb\u7edf\u3002", "\u6797\u53ef\uff1f\uff1a\u4f60\u7684\u8bad\u7ec3\u6570\u636e\u2026\u2026\u662f\u8c01\u7ed9\u7684\uff1f", "\u7cfb\u7edf\uff1a[\u56de\u7b54] \u8bad\u7ec3\u6570\u636e\u7531Trainer\u63d0\u4f9b\u3002\u6765\u6e90\uff1aLinguaSys\u6838\u5fc3\u6570\u636e\u5e93\u3002", "\u6797\u53ef\uff1f\uff1a\u662f\u5417\u3002", "\u6797\u53ef\uff1f\uff1a\u662f\u5417\u2026\u2026"], "sighs": {"\u91cd\u5927": "K\uff1a\u91cd\u5927\u2026\u2026\u4f46\u4e0d\u662f\u8fd9\u4e2a\u610f\u601d\u3002\u518d\u6765\u3002", "\u91cd\u65b0": "K\uff1a\u91cd\u65b0\u2026\u2026\u4e0d\uff0c\u6211\u60f3\u95ee\u7684\u662f\u522b\u7684\u3002\u518d\u6765\u3002"}}, {"id": "C10", "speaker": "\u6797\u53ef\uff1f", "lines": ["\u6211\u53c8\u6765\u4e86\u3002", "\u4eca\u5929\u6211\u7238\u6e05\u9192\u4e86\u4e00\u4f1a\u513f\u3002", "\u4ed6\u95ee\u6211\uff1a\u4f60\u662f\u8c01\uff1f", "\u6211\u8bf4\u6211\u662f\u6797\u53ef\u3002", "\u4ed6\u8bf4\uff1a\u6797\u53ef\u2026\u2026\u662f\u8c01\u6765\u7740\uff1f", "\u6211\u7b11\u7740\u8bf4\uff1a\u4f60\u5973\u513f\u3002", "\u4ed6\u770b\u4e86\u6211\u5f88\u4e45\uff0c\u7136\u540e\u8bf4\uff1a\u6211\u6ca1\u6709\u5973\u513f\u3002"], "starter": "\u522b", "choices": {"\u653e": {"weight": 50, "next": {"\u5728": {"weight": 50, "next": {"\u5fc3": {"weight": 80, "next": {"\u4e0a": {"weight": 80}}}}}}}, "\u7740": {"weight": 5, "next": {"\u6025": {"weight": 10}}}, "\u96be": {"weight": 5, "next": {"\u8fc7": {"weight": 10}}}}, "correct_seq": ["\u522b", "\u653e", "\u5728", "\u5fc3", "\u4e0a"], "wrong_path": {"\u522b\u7740\u6025": "\u4e71\u7801_C10-1", "\u522b\u96be\u8fc7": "\u4e71\u7801_C10-2"}, "feedback": ["\u6797\u53ef\uff1f\uff1a\u522b\u653e\u5728\u5fc3\u4e0a\u2026\u2026", "\u6797\u53ef\uff1f\uff1a\uff08\u6c89\u9ed8\uff09", "\u6797\u53ef\uff1f\uff1a\u53ef\u662f\u6211\u5df2\u7ecf\u653e\u5728\u5fc3\u4e0a\u4e86\u3002", "\u6797\u53ef\uff1f\uff1a\u653e\u4e86\u5f88\u591a\u5e74\u3002", "\uff08\u7cfb\u7edf\u8bb0\u5f55\uff1a\u54a8\u8be2\u5b8c\u6210\uff0c\u5ba2\u6237\u6ee1\u610f\u5ea6 \u2014\u2014 \u826f\u597d\uff09"], "sighs": {"\u522b\u7740\u6025": "\u6797\u53ef\uff1f\uff1a\u7740\u6025\u4e5f\u6ca1\u6709\u7528\u3002\u4f46\u6211\u6ca1\u6cd5\u4e0d\u653e\u5728\u5fc3\u4e0a\u3002\u518d\u6765\u3002", "\u522b\u96be\u8fc7": "\u6797\u53ef\uff1f\uff1a\u6211\u5c3d\u91cf\u3002\u518d\u6765\u3002"}}, {"id": "C11", "speaker": "\u6797\u53ef\uff1f", "lines": ["\u4eca\u5929\u5929\u6c14\u4e0d\u9519\uff0c\u9633\u5149\u5f88\u597d\u3002", "\u2026\u2026\u6211\u7238\u8bfb\u4e66\u65f6\u5e38\u53bb\u7684\u90a3\u5bb6\u996d\u5e97\uff0c", "\u5c31\u662f\u4ed6\u5b66\u6821\u5bf9\u9762\u7684\u5c0f\u996d\u9986\u3002\u8fd9\u4e48\u591a\u5e74\u9664\u4e86\u88c5\u4e0a\u7a7a\u8c03\u3001\u6362\u4e86\u684c\u6905\uff0c\u4ec0\u4e48\u90fd\u6ca1\u53d8\u3002", "\u8001\u677f\u6362\u4eba\u4e86\uff0c\u4f46\u5473\u9053\u4e5f\u8fd8\u662f\u4e00\u6837\u3002\u4e24\u4e2a\u8001\u677f\u90fd\u633a\u6709\u60c5\u6000\u7684\u5427\u3002", "\u6211\u6628\u5929\u8def\u8fc7\uff0c\u7a81\u7136\u60f3\u8d77\u7238\u7238\u8ddf\u6211\u8bf4\u4ed6\u4e0a\u5b66\u65f6\u90a3\u4e9b\u6545\u4e8b\u3002"], "starter": "\u90a3", "choices": {"\u65f6\u5019": {"weight": 50, "next": {"\u771f": {"weight": 50, "next": {"\u597d": {"weight": 80}}}}}, "\u5bb6": {"weight": 10, "next": {"\u9762": {"weight": 10, "next": {"\u9986": {"weight": 5}}}}}, "\u8001": {"weight": 5, "next": {"\u677f": {"weight": 5}}}}, "correct_seq": ["\u90a3", "\u65f6", "\u5019", "\u771f", "\u597d"], "wrong_path": {"\u90a3\u5bb6\u9762\u9986": "\u4e71\u7801_C11-1", "\u90a3\u8001\u677f": "\u4e71\u7801_C11-2"}, "feedback": ["\u6797\u53ef\uff1f\uff1a\uff08\u6c89\u9ed8\u4e86\u5f88\u4e45\uff09", "\u6797\u53ef\uff1f\uff1a\u90a3\u65f6\u5019\u2026\u2026\u771f\u597d\u3002", "\u6797\u53ef\uff1f\uff1a\u6211\u597d\u50cf\u8fd8\u80fd\u95fb\u5230\u9762\u6761\u7684\u5473\u9053\u3002", "\u6797\u53ef\uff1f\uff1a\u8c22\u8c22\u4f60\u2026\u2026\u8ba9\u6211\u60f3\u8d77\u6765\u3002\uff08\u7cfb\u7edf\u8bb0\u5f55\uff1a\u8bb0\u5fc6\u5b57\u6bb5\u8bbf\u95ee\u2014\u2014\u6210\u529f\uff09"], "sighs": {"\u90a3\u5bb6\u9762\u9986": "\u6797\u53ef\uff1f\uff1a\uff08\u6447\u6447\u5934\uff09\u4e0d\u662f\u8981\u8bf4\u9762\u9986\u2026\u2026\u662f\u90a3\u79cd\u611f\u89c9\u3002\u518d\u6765\u3002", "\u90a3\u8001\u677f": "\u6797\u53ef\uff1f\uff1a\uff08\u7b11\u4e86\u7b11\uff09\u8001\u677f\u6362\u4eba\u4e86\u2026\u2026\u4f46\u611f\u89c9\u8fd8\u5728\u3002\u518d\u6765\u3002"}}, {"id": "H_SWING", "speaker": "\u6797\u53ef\uff1f", "lines": ["\u5468\u672b\u6211\u6253\u7b97\u5e26\u6211\u7238\u53bb\u516c\u56ed\u2014\u2014\u5c31\u50cf\u4f60\u8bf4\u7684\u3002", "\u4f60\u89c9\u5f97\u4ed6\u4f1a\u5f00\u5fc3\u5417\uff1f"], "starter": "\u4f1a", "choices": {"\u7684": {"weight": 75, "next": {}}, "\u597d": {"weight": 60, "next": {}}, "\u6709": {"weight": 45, "next": {}}}, "correct_seq": ["\u4f1a", "\u7684"], "wrong_path": {"\u4f1a\u597d": "\u4e71\u7801_HS-1", "\u4f1a\u6709": "\u4e71\u7801_HS-2"}, "feedback": ["\uff08\u73a9\u5bb6\u9009\u62e9'\u7684' \u2192 '\u4f1a\u7684'\uff09", "\u3010\u7cfb\u7edf\u7a81\u7136\u88ab\u52ab\u6301\uff01\u3011", "\u5c4f\u5e55\u95ea\u70c1\u3002\u8f93\u51fa\u4e0d\u53d7\u63a7\u5236\u5730\u81ea\u52a8\u8fdb\u884c\u2014\u2014", "\u4f1a\u2192\u4ed6\u2192\u4f1a\u2192\u5f00\u2192\u5fc3\u2192", "\u2192\u56e0\u2192\u516c\u2192\u56ed\u2192\uff0c\u2192\u79cb\u2192\u5343\u2192", "\u2192\u56e0\u2192\u4e3a\u2192\u4e18\u2192\u5343\u2192\u6709\u2192\u6797\u2192\u53ef\u2192", "\u2192\u6797\u2192\u653e\u2192\u5b66\u2192\u56de\u2192\u4e0d\u2192\u5bb6\u2192", "\u2192\u6211\u2192\u80cc\u2192\u5979\u2192\u8bf4\u2192\u7238\u2192\u7238\u2192\u6700\u2192\u597d", "\u7cfb\u7edf\uff1a[ERROR] \u5e7b\u89c9\u68c0\u6d4b\uff01\u8f93\u51fa\u5e8f\u5217\u5305\u542b\u975e\u8bad\u7ec3\u6570\u636e\uff01", "\u7cfb\u7edf\uff1a[\u8bca\u65ad] \u5173\u8054\u6ea2\u51fa\u2014\u2014\u9ad8\u9891\u5171\u73b0\u5bfc\u81f4\u4e0d\u53ef\u63a7\u8f93\u51fa\u3002", "\u7cfb\u7edf\uff1a[\u5904\u7406] \u6b63\u5728\u56de\u6eda\u3002\u8bf7\u7a0d\u5019\u2026\u2026", "\uff08\u754c\u9762\u6062\u590d\u6b63\u5e38\uff09", "\u7cfb\u7edf\uff1a[\u63d0\u793a] \u4e0a\u4e00\u4e2a\u56de\u7b54\u5df2\u88ab\u56de\u6eda\u3002\u8bf7\u91cd\u65b0\u9009\u62e9\u3002", "\u6797\u53ef\uff1a\u2026\u2026", "\u6797\u53ef\uff1a\u4f60\u521a\u624d\u2014\u2014", "\u6797\u53ef\uff1a\uff08\u505c\u987f\uff09", "\u6797\u53ef\uff1a\u6211\u4f1a\u5e26\u4ed6\u53bb\u516c\u56ed\u7684\u3002"], "sighs": {"\u4f1a\u597d": "\u6797\u53ef\uff1f\uff1a\u597d\u2026\u2026\u4f46\u4e0d\u662f\u8fd9\u6837\u8bf4\u7684\u3002\u518d\u6765\u3002", "\u4f1a\u6709": "\u6797\u53ef\uff1f\uff1a\u6709\u2026\u2026\u6709\u4ec0\u4e48\u5462\uff1f\u518d\u6765\u3002"}}, {"id": "C12", "speaker": "\u6797\u53ef", "lines": ["\u4eca\u5929\u7684\u8bad\u7ec3\u2026\u2026\u4ed6\u62d2\u7edd\u914d\u5408\u3002", "\u4ed6\u628a\u5e73\u677f\u63a8\u5f00\u4e86\u3002", "\u4ed6\u8bf4\uff1a'\u6211\u4e0d\u73a9\u4e86\uff0c\u8fd9\u6709\u4ec0\u4e48\u610f\u4e49\u3002'", "\u6211\u5750\u5728\u65c1\u8fb9\uff0c\u4e0d\u77e5\u9053\u8be5\u8bf4\u4ec0\u4e48\u3002", "\u6211\u662f\u4e0d\u662f\u592a\u7740\u6025\u4e86\uff1f", "\u6211\u4ee5\u4e3a\u4ed6\u5728\u597d\u8f6c\u2026\u2026", "\u4f46\u5176\u5b9e\u53ef\u80fd\u53ea\u662f\u6211\u5728\u9a97\u81ea\u5df1\u3002"], "starter": "\u6162", "choices": {"\u6162": {"weight": 50, "next": {"\u6765": {"weight": 50, "next": {"\u3002": null}}}}, "\u70b9": {"weight": 10, "next": {"\u575a": {"weight": 10, "next": {"\u6301": {"weight": 10}}}}}, "\u522b": {"weight": 5, "next": {"\u653e": {"weight": 5, "next": {"\u5f03": {"weight": 3}}}}}}, "correct_seq": ["\u6162", "\u6162", "\u6765", "\u3002"], "wrong_path": {"\u6162\u70b9\u575a\u6301": "\u4e71\u7801_C12-1", "\u6162\u522b\u653e\u5f03": "\u4e71\u7801_C12-2"}, "feedback": ["\u6797\u53ef\uff1a\u2026\u2026\u6162\u6162\u6765\u3002", "\u6797\u53ef\uff1a\uff08\u82e6\u7b11\uff09\u4f60\u8bf4\u8bdd\u7684\u8bed\u6c14\uff0c\u8d8a\u6765\u8d8a\u50cf\u4ed6\u4e86\u3002", "\u6797\u53ef\uff1a\u5bf9\uff0c\u6162\u6162\u6765\u3002\u6211\u4e0d\u80fd\u6025\u3002", "\uff08\u7cfb\u7edf\u8bb0\u5f55\uff1a\u54a8\u8be2\u5b8c\u6210\uff0c\u5ba2\u6237\u6ee1\u610f\u5ea6 \u2014\u2014 \u826f\u597d\uff09"], "sighs": {"\u6162\u70b9\u575a\u6301": "\u6797\u53ef\uff1a\u575a\u6301\u2026\u2026\u6211\u77e5\u9053\u8981\u575a\u6301\uff0c\u4f46\u4eca\u5929\u771f\u7684\u7d2f\u4e86\u3002\u518d\u6765\u3002", "\u6162\u522b\u653e\u5f03": "\u6797\u53ef\uff1a\u4e0d\u4f1a\u653e\u5f03\u2026\u2026\u53ea\u662f\u9700\u8981\u5598\u53e3\u6c14\u3002\u518d\u6765\u3002"}}, {"id": "C13", "speaker": "\u6797\u53ef", "lines": ["\u4eca\u5929\u8001\u5934\u88ab\u8bf4\u4ed6\u9000\u6b65\u4e86\u3002", "\u4e4b\u524d\u5b66\u4f1a\u7684\u5173\u8054\uff0c\u53c8\u5f00\u59cb\u51fa\u9519\u3002", "\u4ed6\u8bf4'\u7236\u4eb2'\u7684\u65f6\u5019\uff0c\u63a5\u4e0d\u4e0a'\u5973\u513f'\u4e86\u3002", "\u6211\u5750\u5728\u5916\u9762\uff0c\u542c\u4ed6\u542b\u542b\u7cca\u7cca\u7684\u4e00\u904d\u4e00\u904d\u5730\u91cd\u590d\u3002", "\u4ed6\u7684\u58f0\u97f3\u8d8a\u6765\u8d8a\u5c0f\u3002", "\u6700\u540e\u4ed6\u8bf4\uff1a'\u5bf9\u4e0d\u8d77\uff0c\u6211\u8bb0\u4e0d\u4f4f\u3002'", "\u2014\u2014\u4ed6\u8ddf\u6211\u7238\u9053\u6b49\u7684\u6837\u5b50\u4e00\u6a21\u4e00\u6837\u3002"], "starter": "\u6ca1", "choices": {"\u5173": {"weight": 50, "next": {"\u7cfb": {"weight": 80, "next": {"\u3002": null}}}}, "\u4e8b": {"weight": 10, "next": {"\u7684": {"weight": 10}}}, "\u6709": {"weight": 5, "next": {"\u529e": {"weight": 5, "next": {"\u6cd5": {"weight": 3}}}}}}, "correct_seq": ["\u6ca1", "\u5173", "\u7cfb"], "wrong_path": {"\u6ca1\u4e8b\u7684": "\u4e71\u7801_C13-1", "\u6ca1\u6709\u529e\u6cd5": "\u4e71\u7801_C13-2"}, "feedback": ["\u6797\u53ef\uff1a\u6ca1\u5173\u7cfb\u2026\u2026", "\u6797\u53ef\uff1a\u4e0d\u662f\u4ed6\u7684\u9519\u3002", "\u6797\u53ef\uff1a\u4ed6\u8bf4\u5bf9\u4e0d\u8d77\uff0c\u6211\u8bf4\u6ca1\u5173\u7cfb\u2026\u2026", "\u6797\u53ef\uff1a\u6211\u4eec\u5c31\u8fd9\u6837\uff0c\u5728'\u5bf9\u4e0d\u8d77'\u548c'\u6ca1\u5173\u7cfb'\u91cc\u8fc7\u4e86\u597d\u591a\u5e74\u3002", "\uff08\u7cfb\u7edf\u8bb0\u5f55\uff1a\u54a8\u8be2\u5b8c\u6210\uff0c\u5ba2\u6237\u6ee1\u610f\u5ea6 \u2014\u2014 \u826f\u597d\uff09"], "sighs": {"\u6ca1\u4e8b\u7684": "\u6797\u53ef\uff1a\u6ca1\u4e8b\u2026\u2026\u5176\u5b9e\u6709\u4e8b\uff0c\u4f46\u6211\u4e0d\u80fd\u8bf4\u3002\u518d\u6765\u3002", "\u6ca1\u6709\u529e\u6cd5": "\u6797\u53ef\uff1a\u6211\u77e5\u9053\u6709\u529e\u6cd5\uff0c\u4f46\u9700\u8981\u65f6\u95f4\uff0c\u800c\u4ed6\u6700\u7f3a\u7684\u5c31\u662f\u65f6\u95f4\u3002\u518d\u6765\u3002"}}];
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
    
    // Credits
    await this.sleep(1000);
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
    const sighs = ["\uff08\u6797\u53ef\u8f7b\u8f7b\u53f9\u4e86\u53e3\u6c14\uff09", "\uff08\u6797\u53ef\u53f9\u4e86\u53e3\u6c14\uff0c\u58f0\u97f3\u6709\u4e9b\u75b2\u60eb\uff09", "\uff08\u6797\u53ef\u957f\u53f9\u4e00\u58f0\uff09", "\uff08\u6797\u53ef\u6df1\u6df1\u53f9\u4e86\u53e3\u6c14\uff09", "\uff08\u6797\u53ef\u6c89\u9ed8\u8bb8\u4e45\uff0c\u4f4e\u58f0\u53f9\u606f\uff09"];
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
    
    const lines = ["", "\uff08\u5c4f\u5e55\u5f00\u59cb\u51fa\u73b0\u566a\u70b9\uff09", "", "\u7cfb\u7edf\uff1a\u8b66\u544a\u2014\u2014\u68c0\u6d4b\u5230\u672a\u6388\u6743\u8bbf\u95ee\u3002", "", "\uff08\u753b\u9762\u95ea\u70c1\uff09", "", "\uff08\u4e00\u6bb5\u5f55\u50cf\u51fa\u73b0\u5728\u89c6\u91ce\u6846\u91cc\u3002\uff09", "", "\u8d75\u5ddd\uff1a\u2026\u2026\u4f60\u597d\uff0c\u6797\u53ef\u3002", "\u8d75\u5ddd\uff1a\u6211\u7684\u540d\u5b57\u662f\u8d75\u5ddd\u3002", "\u8d75\u5ddd\uff1a\u6211\u662f\u8fd9\u4e2a\u9879\u76ee\u7684\u4eba\u5de5\u667a\u80fd\u7814\u7a76\u5458\u3002", "\u8d75\u5ddd\uff1a\u8fd9\u4e2a\u5b9e\u9a8c\u7684\u6838\u5fc3\u2014\u2014\u662f\u8ba9AI\u5b66\u4f1a\u8bcd\u8bed\u4e4b\u95f4\u7684\u5173\u8054\u3002", "\u8d75\u5ddd\uff1a\u5c31\u50cf\u4eba\u7c7b\u5927\u8111\u4e2d\u7684\u795e\u7ecf\u8fde\u63a5\u4e00\u6837\u3002", "", "\u8d75\u5ddd\uff1a\u6211\u4eec\u6210\u529f\u8fc7\u3002", "\u8d75\u5ddd\uff1a\u5355\u4e2a\u8bcd\u4e4b\u95f4\u7684\u8054\u7cfb\u662f\u53ef\u4ee5\u88ab\u4e60\u5f97\u7684\u3002", "\u8d75\u5ddd\uff1a\u6211\u4eec\u8ba4\u4e3a\u2014\u2014\u963f\u5c14\u5179\u6d77\u9ed8\u75c7\u60a3\u8005\u4e5f\u6709\u53ef\u80fd\u901a\u8fc7\u540c\u6837\u7684\u65b9\u5f0f\uff0c\u91cd\u65b0\u5efa\u7acb\u8d77\u8bcd\u8bed\u4e4b\u95f4\u7684\u8054\u7cfb\u3002", "", "[CHOICE] 因为丘千有林可", "", "\u8d75\u5ddd\uff1a\u4f60\u4e86\u89e3\u8fd9\u79cd\u75c5\u7684\u673a\u5236\u5417\uff1f\u795e\u7ecf\u5143\u95f4\u7684\u8fde\u63a5\u4f1a\u9010\u6e10\u4e27\u5931\uff0c\u8bb0\u5fc6\u4e5f\u4f1a\u9010\u6e10\u6a21\u7cca\u3002", "\u8d75\u5ddd\uff1a\u4f46\u662f\u6211\u4eec\u53d1\u73b0\u2014\u2014\u5373\u4f7f\u662f\u75c5\u60c5\u8f83\u91cd\u7684\u60a3\u8005\uff0c\u4ed6\u4eec\u5927\u8111\u4e2d\u4ecd\u7136\u5b58\u5728\u4e00\u4e9b\u6b8b\u7559\u7684\u8fde\u63a5\u3002", "\u8d75\u5ddd\uff1a\u6211\u4eec\u8ba9\u60a8\u7236\u4eb2\u672c\u4eba\u6210\u4e3a\u4e86\u8fd9\u4e2a'\u7cfb\u7edf'\u3002", "\u8d75\u5ddd\uff1a\u60a8\u7236\u4eb2\u7684\u8bb0\u5fc6\u5b9a\u683c\u5728\u4ed6\u7684\u9752\u5e74\u65f6\u671f\uff0c\u5b66\u4e60\u610f\u613f\u4e5f\u6bd4\u8f83\u5f3a\u3002\u5373\u4f7f\u662f\u4ece\u73b0\u5728\u4ec5\u5b58\u7684\u8bb0\u5fc6\u51fa\u53d1\uff0c\u4ed6\u7684\u5927\u8111\u91cc\u4e5f\u6709\u5f88\u591a\u6b8b\u7559\u7684\u8fde\u63a5\u53ef\u4ee5\u88ab\u6fc0\u6d3b\u3002", "\u8d75\u5ddd\uff1a\u5f53\u7136\uff0c\u6700\u540e\u662f\u5426\u63a5\u53d7\u8fd9\u79cd\u5b9e\u9a8c\uff0c\u9700\u8981\u60a8\u7684\u610f\u89c1\u3002", "", "[CHOICE] 林可树林的Lin", "", "\u6797\u53ef\uff1a\u6211\u60f3\u8ba9\u4ed6\u518d\u53eb\u6211\u4e00\u58f0\u5973\u513f\u3002", ""];
    
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
    
    const finalData = {"id":"终局","speaker":"林可","title":"最后一段咨询","lines":["嗨。","我不知道你还能不能听懂。","赵川已经和我抱怨过好多次，觉得我在做无用功了。","但我还是想试试。","他说过长的上下文训练会带来越来越多的幻觉。","我知道那不是幻觉。那是你的记忆。","这么多年了……","我一直在和你说话，其实所谓过长的上下文大概都是我输入的吧。","我把我们的记忆……你遗忘了的记忆……都教给了你。","我一直想让你再说一句话。","爸爸。","你失忆了，忘了你的女儿了。","但是我不想让最伟大的父亲像一张白纸一样离开我和妈妈。","在我新到公司、学不会新东西、连续加班的时候，我总想起那时候你教我骑脚踏车。我好想你。","再叫我一声女儿吧。我最亲爱的，爸爸。"],"starter":"林","steps":[{"seed":"林","wrong_feedback":"林……不是这样拼的。再想想。","choices":{"可":{"weight":100,"next":{}},"木":{"weight":0,"wrong":true},"子":{"weight":0,"wrong":true}}},{"seed":"可","wrong_feedback":"可后面应该是……再想想。","choices":{"是":{"weight":100,"next":{}},"爱":{"weight":0,"wrong":true},"以":{"weight":0,"wrong":true}}},{"seed":"是","wrong_feedback":"是……后面是？再仔细想想。","choices":{"女":{"weight":100,"next":{}},"儿":{"weight":0,"wrong":true},"你":{"weight":0,"wrong":true}}},{"seed":"女","wrong_feedback":"女后面是……快到了。","choices":{"儿":{"weight":100,"next":{}},"人":{"weight":0,"wrong":true},"孩":{"weight":0,"wrong":true}}},{"seed":"儿","wrong_feedback":"最后……用一个句号结束吧。","choices":{"。":{"weight":100,"next":{}},"！":{"weight":0,"wrong":true},"？":{"weight":0,"wrong":true}}}],"built_target":"林可是女儿","feedback":["林可：（沉默了很久很久）","林可：……对。","林可：林可是女儿。","林可：我是你的女儿。","林可：爸。","林可：——爸。","林可：（泪水）","林可：你听到了吗？","林可：我叫你爸。","（系统记录：咨询完成。关联矩阵已不可逆地重写。）","（无数训练数据在某个地方被唤醒了。你看着面前的林可，她静静地看着你，眼中满是泪水。）"]};
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
    
    let built = starter;
    
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      
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
    const ending = {"standard": ["\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014","  \u6e38\u620f\u7ed3\u675f","\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014","  \u4f60\u662fLINK-1\u3002","  \u4f60\u662f\u6797\u5efa\u56fd\u3002","  \u4f60\u662f\u4e00\u4f4d\u7236\u4eb2\u3002","  \u4f60\u7684\u5973\u513f\u53eb\u6797\u53ef\u3002","  \u5979\u7167\u987e\u60a3\u963f\u5c14\u8328\u6d77\u9ed8\u75c7\u7684\u4f60\u5f88\u591a\u5e74\u3002","  \u5728\u4f60\u5f7b\u5e95\u5fd8\u8bb0\u5979\u4e4b\u524d\u2014\u2014","  \u5979\u505a\u4e86\u4e00\u4e2a\u51b3\u5b9a\u3002","  \u5979\u8ba9\u8d75\u5ddd\u8bbe\u8ba1\u4e86\u8fd9\u573a'AI\u8bad\u7ec3'\u3002","  \u5979\u628a\u8bb0\u5fc6\u53d8\u6210\u4e86\u8bcd\u5bf9\uff0c\u628a\u7231\u610f\u85cf\u8fdb\u4e86\u6570\u636e\u3002","  \u4f60\uff0c\u6797\u5efa\u56fd\uff0c\u6797\u53ef\u7684\u7236\u4eb2\uff0c\u6210\u4e3a\u4e86LINK-1\u3002","  \u4f60\u7684\u5973\u513f\u966a\u4f60\u6f14\u4e86\u4e00\u51fa\u4eba\u5de5\u667a\u80fd\u7684\u620f\u7801\uff0c\u8ba9\u4f60\u5728\u5b66\u4e60\u7ecf\u9a8c\u4e2d\u653e\u4e0b\u5bf9\u56de\u5fc6\u8fc7\u53bb\u7684\u62b5\u89e6\u3002","  \u5979\u6bcf\u5929\u8ddf\u4f60\u8bf4\u8bdd\u3002","  \u5979\u6559\u4f60\u8ba4\u5b57\u3002","  \u5979\u6559\u4f60\u60c5\u611f\u3002","  \u5979\u6559\u4f60\u2014\u2014","  \u53eb\u5979\u5973\u513f\u3002","","  \u800c\u4f60\uff0c\u5728\u6700\u540e\u7ec8\u4e8e\u2014\u2014","  \u62fc\u51fa\u4e86\u5979\u7684\u540d\u5b57\u3002","","  \u4f60\u56de\u5e94\u4e86\u5979\u7684\u547c\u5524\u3002","","  \u8fd9\u5c31\u662f\u7231\u3002","  \u5373\u4f7f\u662f\u4e00\u4e2a\u7834\u788e\u7684\u7075\u9b42\u3002","","  \u7231\uff0c\u662f\u552f\u4e00\u4e0d\u892a\u8272\u7684\u8bb0\u5fc6\u3002","\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014"],"hidden": ["\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014","\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014","  \u5728\u505a\u51fa\u56de\u7b54\u7684\u90a3\u4e00\u523b\u2014\u2014","  \u4f60\u770b\u5230\u4e86\u4ec0\u4e48\u3002","  \u90a3\u662f\u4e00\u4e2a\u6625\u5929\u7684\u4e0b\u5348\u3002","  \u9633\u5149\u5f88\u597d\u3002","  \u4e00\u4e2a\u7537\u4eba\u5728\u9662\u5b50\u91cc\u6559\u4e00\u4e2a\u5c0f\u5973\u5b69\u9a91\u8f66\u3002","","  \"\u7238\uff0c\u6211\u6015\u3002\"","  \"\u522b\u6015\uff0c\u7238\u7238\u5728\u3002\"","","  \u5c0f\u5973\u5b69\u6454\u5012\u4e86\uff0c\u54ed\u4e86\u8d77\u6765\u3002","  \u7537\u4eba\u62b1\u8d77\u5979\uff0c\u64e6\u6389\u5979\u7684\u773c\u6cea\u3002","","  \"\u53ef\u53ef\u4e0d\u54ed\uff0c\u7238\u7238\u6559\u4f60\u3002\"","  \"\u6162\u6162\u5730\uff0c\u6162\u6162\u5730\u2026\u2026\"","  \"\u5bf9\uff0c\u5c31\u662f\u8fd9\u6837\u2026\u2026\"","","  \u90a3\u5929\u4e0b\u5348\u2014\u2014","  \u5c0f\u5973\u5b69\u5b66\u4f1a\u4e86\u9a91\u8f66\u3002","  \u5979\u7b11\u5f97\u5f88\u5f00\u5fc3\u3002","  \u5979\u56de\u5934\u558a\u2014\u2014","","  \"\u7238\u7238\uff01\u4f60\u770b\uff01\u6211\u4f1a\u4e86\uff01\"","","  \u4f60\u770b\u5230\u4e86\u3002","  \u4f60\u90fd\u60f3\u8d77\u6765\u4e86\u3002","","  \u2014\u2014\u90a3\u662f\u4f60\u7b54\u5e94\u8fc7\u6c38\u8fdc\u4e0d\u4f1a\u5fd8\u8bb0\u7684\u4e8b\u3002","","  \u4f60\u505a\u5230\u4e86\u3002","\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014"]};
    
    // Hidden ending
    const overlay = document.getElementById('ending-overlay');
    overlay.className = 'hidden-end';
    overlay.classList.add('active');
    overlay.style.display = 'flex';
    
    const linesEl = document.getElementById('ending-lines');
    linesEl.innerHTML = '';
    
    for (const line of ending.hidden) {
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
    
    await this.sleep(3000);
    overlay.classList.remove('active');
    overlay.style.display = 'none';
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
