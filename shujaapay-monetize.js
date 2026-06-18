(function() {
  let scriptTag = document.currentScript;
  if (!scriptTag) {
    // Fallback to find script tag by src
    const scripts = document.getElementsByTagName('script');
    for (let i = 0; i < scripts.length; i++) {
      const src = scripts[i].src || '';
      if (src.includes('shujaapay-monetize.js')) {
        scriptTag = scripts[i];
        break;
      }
    }
  }
  if (!scriptTag) return;

  function escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Sanitize input attributes
  const slug = (scriptTag.getAttribute('data-slug') || '').replace(/[^a-zA-Z0-9_-]/g, '');
  const triggerTime = parseFloat(scriptTag.getAttribute('data-time') || '10');
  const minAmount = parseFloat(scriptTag.getAttribute('data-amount') || '0.1');
  const title = scriptTag.getAttribute('data-title') || 'Premium Content Locked';
  const isRequired = scriptTag.getAttribute('data-required') !== 'false';
  const defaultGeo = (scriptTag.getAttribute('data-geo') || '').replace(/[^a-zA-Z]/g, '').slice(0, 2);
  const contentType = ['video', 'audio', 'page', 'element', 'live', 'download', 'interactive'].includes(scriptTag.getAttribute('data-type')) ? scriptTag.getAttribute('data-type') : 'video';
  const targetSelector = scriptTag.getAttribute('data-target') || '';
  const gatewayUrl = new URL(scriptTag.src).origin;

  let hasPaid = false;
  let isModalOpen = false;
  let totalStreamed = 0;
  let currentCurrency = 'KES';
  let creatorName = '';
  let stkMockEl = null;

  // Inject CSS styles
  const style = document.createElement('style');
  style.textContent = `
    .sp-paywall-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2147483647;
      font-family: system-ui, -apple-system, sans-serif;
      color: #f8fafc;
      opacity: 0;
      transition: opacity 0.3s ease;
      pointer-events: none;
    }
    .sp-paywall-overlay.active {
      opacity: 1;
      pointer-events: auto;
    }
    .sp-paywall-overlay.sp-page-mode {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
    }
    .sp-modal {
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 24px;
      padding: 28px;
      width: 90%;
      max-width: 420px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      transform: scale(0.9);
      transition: transform 0.3s ease;
      text-align: center;
      position: relative;
    }
    .sp-paywall-overlay.active .sp-modal {
      transform: scale(1);
    }
    .sp-icon {
      width: 56px;
      height: 56px;
      background: rgba(16, 185, 129, 0.1);
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
    }
    .sp-title {
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 8px;
      color: #ffffff;
    }
    .sp-desc {
      font-size: 13px;
      color: #94a3b8;
      line-height: 1.5;
      margin-bottom: 20px;
    }
    .sp-amount-group {
      background: #1e293b;
      border: 1px solid #475569;
      border-radius: 16px;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }
    .sp-amount-label {
      font-size: 12px;
      color: #94a3b8;
      font-weight: 500;
    }
    .sp-amount-input-wrapper {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .sp-currency {
      font-size: 16px;
      font-weight: 700;
      color: #10b981;
    }
    .sp-amount-input {
      background: transparent;
      border: none;
      color: #ffffff;
      font-size: 20px;
      font-weight: 700;
      text-align: right;
      width: 80px;
      outline: none;
    }
    .sp-methods-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
      margin-bottom: 8px;
      text-align: left;
    }
    .sp-method-select {
      width: 100%;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 12px 14px;
      color: #ffffff;
      font-size: 14px;
      outline: none;
      box-sizing: border-box;
      margin-bottom: 16px;
      cursor: pointer;
      appearance: none;
      -webkit-appearance: none;
      -moz-appearance: none;
      background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
      background-repeat: no-repeat;
      background-position: right 14px center;
      background-size: 16px;
      padding-right: 40px;
    }
    .sp-method-select:focus {
      border-color: #10b981;
    }
    .sp-method-select option {
      background: #0f172a;
      color: #ffffff;
    }
    .sp-input-phone {
      width: 100%;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 12px 14px;
      color: #ffffff;
      font-size: 14px;
      outline: none;
      box-sizing: border-box;
      margin-bottom: 16px;
      text-align: center;
    }
    .sp-input-phone:focus {
      border-color: #10b981;
    }
    .sp-pay-btn {
      width: 100%;
      background: #10b981;
      color: #0f172a;
      border: none;
      border-radius: 12px;
      padding: 14px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .sp-pay-btn:hover {
      background: #059669;
    }
    .sp-pay-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .sp-skip-btn {
      width: 100%;
      background: transparent;
      border: 1px solid #334155;
      color: #94a3b8;
      border-radius: 12px;
      padding: 10px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 8px;
      transition: all 0.2s ease;
    }
    .sp-skip-btn:hover {
      background: rgba(255, 255, 255, 0.03);
      color: #ffffff;
    }
    .sp-spinner {
      width: 20px;
      height: 20px;
      border: 3px solid rgba(15, 23, 42, 0.3);
      border-top-color: #0f172a;
      border-radius: 50%;
      animation: sp-spin 0.8s linear infinite;
    }
    @keyframes sp-spin {
      to { transform: rotate(360deg); }
    }

    /* Web Monetization status styles */
    .sp-wm-status-banner {
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.2);
      border-radius: 12px;
      padding: 8px 12px;
      font-size: 11px;
      color: #10b981;
      font-weight: 600;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      animation: pulse-green 2s infinite;
    }
    @keyframes pulse-green {
      0% { opacity: 0.8; }
      50% { opacity: 1; }
      100% { opacity: 0.8; }
    }

    /* Floating Drawer Tipping Styles */
    .sp-floating-drawer-btn {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: #0f172a;
      padding: 12px 20px;
      border-radius: 50px;
      font-weight: 700;
      font-size: 13px;
      box-shadow: 0 10px 25px -5px rgba(16, 185, 129, 0.4);
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      z-index: 2147483646;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      border: 1px solid rgba(255, 255, 255, 0.1);
      user-select: none;
      font-family: system-ui, -apple-system, sans-serif;
    }
    .sp-floating-drawer-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 15px 30px -5px rgba(16, 185, 129, 0.6);
    }
    .sp-floating-drawer-btn.hidden {
      opacity: 0;
      transform: translateY(100px);
      pointer-events: none;
    }
    .sp-drawer {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 90%;
      max-width: 380px;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 24px;
      padding: 24px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      z-index: 2147483647;
      transform: translateY(150%) scale(0.95);
      opacity: 0;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      pointer-events: none;
      font-family: system-ui, -apple-system, sans-serif;
      color: #f8fafc;
      text-align: center;
    }
    .sp-drawer.active {
      transform: translateY(0) scale(1);
      opacity: 1;
      pointer-events: auto;
    }
    .sp-drawer-close {
      position: absolute;
      top: 16px;
      right: 16px;
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      font-size: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: color 0.2s ease;
      padding: 4px;
    }
    .sp-drawer-close:hover {
      color: #ffffff;
    }

    /* Blur and locked content styles */
    .sp-blur-content {
      filter: blur(12px) brightness(0.5) !important;
      pointer-events: none !important;
      user-select: none !important;
      transition: filter 0.4s ease;
    }
    
    /* Creator Badge Style */
    .sp-creator-badge {
      font-size: 11px;
      font-weight: 600;
      color: #10b981;
      background: rgba(16, 185, 129, 0.1);
      padding: 4px 12px;
      border-radius: 50px;
      display: inline-block;
      margin-bottom: 12px;
      font-family: system-ui, -apple-system, sans-serif;
    }

    /* Simulated Mobile Phone STK Push Prompt */
    .sp-stk-push-mock {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) scale(0.9);
      width: 290px;
      background: #e2e8f0;
      border: 2px solid #94a3b8;
      border-radius: 14px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
      font-family: monospace, sans-serif;
      color: #1e293b;
      z-index: 2147483647;
      opacity: 0;
      pointer-events: none;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      overflow: hidden;
    }
    .sp-stk-push-mock.active {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
      pointer-events: auto;
    }
    .sp-stk-header {
      background: #475569;
      color: #ffffff;
      padding: 10px 14px;
      font-size: 11px;
      font-weight: bold;
      display: flex;
      justify-content: space-between;
      letter-spacing: 0.05em;
    }
    .sp-stk-body {
      padding: 20px;
      font-size: 12px;
      line-height: 1.5;
      background: #f1f5f9;
      text-align: left;
    }
    .sp-stk-input {
      width: 100%;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 10px;
      font-size: 18px;
      text-align: center;
      margin-top: 12px;
      letter-spacing: 8px;
      box-sizing: border-box;
      outline: none;
      color: #0f172a;
      font-weight: bold;
    }
    .sp-stk-input:focus {
      border-color: #475569;
    }
    .sp-stk-footer {
      display: flex;
      border-top: 1px solid #cbd5e1;
      background: #f8fafc;
    }
    .sp-stk-btn {
      flex: 1;
      background: transparent;
      border: none;
      padding: 14px;
      font-size: 13px;
      font-weight: bold;
      cursor: pointer;
      color: #2563eb;
      text-align: center;
      outline: none;
    }
    .sp-stk-btn:first-child {
      border-right: 1px solid #cbd5e1;
      color: #64748b;
    }
    .sp-stk-btn:hover {
      background: #f1f5f9;
    }
    .sp-stk-btn:active {
      background: #e2e8f0;
    }

    /* Embedded compact mode to avoid clipping inside smaller content containers (like video players) */
    .sp-paywall-overlay:not(.sp-page-mode) .sp-modal {
      padding: 14px 18px;
      border-radius: 16px;
      width: 95%;
      max-height: 95%;
      overflow-y: auto;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
    }
    .sp-paywall-overlay:not(.sp-page-mode) .sp-icon {
      display: none !important;
    }
    .sp-paywall-overlay:not(.sp-page-mode) .sp-creator-badge {
      padding: 2px 8px;
      font-size: 10px;
      margin-bottom: 6px;
    }
    .sp-paywall-overlay:not(.sp-page-mode) .sp-title {
      font-size: 15px;
      font-weight: 700;
      margin-bottom: 4px;
    }
    .sp-paywall-overlay:not(.sp-page-mode) .sp-desc {
      font-size: 11px;
      line-height: 1.3;
      margin-bottom: 10px;
    }
    .sp-paywall-overlay:not(.sp-page-mode) .sp-amount-group {
      padding: 6px 12px;
      margin-bottom: 8px;
      border-radius: 10px;
    }
    .sp-paywall-overlay:not(.sp-page-mode) .sp-amount-label {
      font-size: 11px;
    }
    .sp-paywall-overlay:not(.sp-page-mode) .sp-amount-input {
      font-size: 15px;
      width: 60px;
    }
    .sp-paywall-overlay:not(.sp-page-mode) .sp-currency {
      font-size: 13px;
    }
    .sp-paywall-overlay:not(.sp-page-mode) .sp-methods-title {
      font-size: 10px;
      margin-bottom: 4px;
    }
    .sp-paywall-overlay:not(.sp-page-mode) .sp-method-select {
      padding: 8px 10px;
      margin-bottom: 8px;
      font-size: 12px;
      border-radius: 8px;
    }
    .sp-paywall-overlay:not(.sp-page-mode) .sp-input-phone {
      padding: 8px 10px;
      margin-bottom: 8px;
      font-size: 12px;
      border-radius: 8px;
    }
    .sp-paywall-overlay:not(.sp-page-mode) .sp-pay-btn {
      padding: 10px;
      font-size: 12px;
      border-radius: 8px;
    }
    .sp-paywall-overlay:not(.sp-page-mode) .sp-skip-btn {
      padding: 6px;
      font-size: 11px;
      margin-top: 4px;
      border-radius: 8px;
    }
    .sp-paywall-overlay:not(.sp-page-mode) .sp-modal::-webkit-scrollbar {
      width: 4px;
    }
    .sp-paywall-overlay:not(.sp-page-mode) .sp-modal::-webkit-scrollbar-track {
      background: transparent;
    }
    .sp-paywall-overlay:not(.sp-page-mode) .sp-modal::-webkit-scrollbar-thumb {
      background: #334155;
      border-radius: 10px;
    }
  `;
  document.head.appendChild(style);

  let targetContainer = null;
  let mediaEl = null;
  let wmLink = null;
  let overlayEl = null;
  let drawerEl = null;
  let floatingBtnEl = null;

  // Web Monetization standard progress handler
  function handleWebMonetizationProgress(event) {
    const detail = event.detail || {};
    let amount = 0;
    let currency = '';

    if (detail.amountSent) {
      amount = parseFloat(detail.amountSent.value);
      currency = detail.amountSent.currency;
    } else if (detail.amount) {
      const scale = detail.assetScale || 2;
      amount = parseFloat(detail.amount) * Math.pow(10, -scale);
      currency = detail.assetCode;
    }

    if (amount > 0) {
      totalStreamed += amount;
      updateWebMonetizationStatus(totalStreamed, currency);
    }
  }

  function updateWebMonetizationStatus(total, currency) {
    const statusBanners = document.querySelectorAll('.sp-wm-status-banner');
    statusBanners.forEach(banner => {
      banner.style.display = 'flex';
      banner.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
        Streaming via ILP: ${total.toFixed(5)} ${escapeHTML(currency)}
      `;
    });

    // Auto unlock if streamed amount matches or exceeds minAmount
    if (total >= minAmount) {
      hasPaid = true;
      closePaywall();
    }
  }

  function setupWebMonetization(paymentPointer) {
    if (!paymentPointer) return;

    // Inject rel="monetization" tag
    wmLink = document.querySelector('link[rel="monetization"]');
    if (!wmLink) {
      wmLink = document.createElement('link');
      wmLink.rel = 'monetization';
      // Replace leading $ standard pointer with https:// for SPSP resolving
      wmLink.href = paymentPointer.startsWith('$') ? paymentPointer.replace(/^\$/, 'https://') : paymentPointer;
      document.head.appendChild(wmLink);
    }

    // Modern draft: Listen to "monetization" event on link element
    wmLink.addEventListener('monetization', handleWebMonetizationProgress);

    // Legacy/Browser extension fallback: Listen to document.monetization
    if (document.monetization) {
      document.monetization.addEventListener('monetizationprogress', handleWebMonetizationProgress);
      document.monetization.addEventListener('monetizationstart', () => {
        console.log('[ShujaaPay] Web Monetization active (Started)');
        const statusBanners = document.querySelectorAll('.sp-wm-status-banner');
        statusBanners.forEach(banner => {
          banner.style.display = 'flex';
          banner.innerHTML = `Web Monetization Active (Streaming...)`;
        });
      });
      
      if (document.monetization.state === 'started' || document.monetization.state === 'pending') {
        const statusBanners = document.querySelectorAll('.sp-wm-status-banner');
        statusBanners.forEach(banner => {
          banner.style.display = 'flex';
          banner.innerHTML = `Web Monetization Active (Streaming...)`;
        });
      }
    }
  }

  function init() {
    // 1. Locate targets based on contentType
    if (contentType === 'video' || contentType === 'audio') {
      mediaEl = document.querySelector(contentType);
      if (!mediaEl) {
        setTimeout(init, 1000);
        return;
      }
      targetContainer = mediaEl.parentElement;
      if (targetContainer && getComputedStyle(targetContainer).position === 'static') {
        targetContainer.style.position = 'relative';
      }
    } else if (contentType === 'element' || contentType === 'download' || contentType === 'interactive') {
      if (targetSelector) {
        try {
          targetContainer = document.querySelector(targetSelector);
        } catch (e) {
          console.warn('[ShujaaPay] Invalid element target selector:', targetSelector, e);
        }
        if (!targetContainer) {
          setTimeout(init, 1000);
          return;
        }
      } else {
        targetContainer = scriptTag.parentElement;
      }
      if (targetContainer && getComputedStyle(targetContainer).position === 'static') {
        targetContainer.style.position = 'relative';
      }
    } else if (contentType === 'live') {
      try {
        targetContainer = targetSelector ? document.querySelector(targetSelector) : document.querySelector('video')?.parentElement;
      } catch (e) {
        console.warn('[ShujaaPay] Invalid live target selector:', targetSelector, e);
      }
      if (!targetContainer) {
        mediaEl = document.querySelector('video') || document.querySelector('audio');
        if (mediaEl) {
          targetContainer = mediaEl.parentElement;
        } else {
          setTimeout(init, 1000);
          return;
        }
      }
      if (targetContainer && getComputedStyle(targetContainer).position === 'static') {
        targetContainer.style.position = 'relative';
      }
      // Store reference to inner video elements if any
      mediaEl = targetContainer.querySelector('video') || targetContainer.querySelector('audio');
    } else { // 'page' mode
      targetContainer = document.body;
    }

    // Determine if we should launch as a floating tipping button immediately
    const startAsFloatingDrawer = !isRequired && (contentType === 'page' || contentType === 'live');

    // Create structures
    createPaywallOverlay(startAsFloatingDrawer);

    // Setup Event Triggering
    if ((contentType === 'video' || contentType === 'audio') && mediaEl) {
      mediaEl.addEventListener('timeupdate', function() {
        if (!hasPaid && mediaEl.currentTime >= triggerTime && !isModalOpen) {
          showPaywall();
        }
      });
    } else {
      // Set trigger timer for page, element, live, download, interactive
      setTimeout(() => {
        if (!hasPaid && !isModalOpen) {
          showPaywall();
        }
      }, triggerTime * 1000);
    }
  }

  function createPaywallOverlay(startAsFloatingDrawer) {
    // 1. Overlay Modal structure (blocking)
    overlayEl = document.createElement('div');
    overlayEl.className = 'sp-paywall-overlay' + (contentType === 'page' ? ' sp-page-mode' : '');
    overlayEl.innerHTML = `
      <div class="sp-modal">
        <div class="sp-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
        </div>
        <div class="sp-creator-badge" id="sp-creator-badge" style="display: none;"></div>
        <div class="sp-title">${escapeHTML(title)}</div>
        
        <!-- Web Monetization Active Banner -->
        <div class="sp-wm-status-banner" style="display:none;"></div>

        <div class="sp-desc">Unlock premium playback with a payment. Select your method below.</div>
        
        <div class="sp-amount-group">
          <span class="sp-amount-label">Support Amount</span>
          <div class="sp-amount-input-wrapper">
            <span class="sp-currency" id="sp-currency-label">KES</span>
            <input type="number" class="sp-amount-input" id="sp-amount-val" value="${minAmount}" min="${minAmount}" step="0.5">
          </div>
        </div>

        <div class="sp-methods-title">Payment Option</div>
        <select class="sp-method-select" id="sp-methods-select">
          <option value="mpesa">M-Pesa (KE)</option>
          <option value="wallet">ShujaaPay Wallet [TESTNET]</option>
          <option value="usdc">USDC Stablecoin [TESTNET]</option>
        </select>

        <input type="tel" class="sp-input-phone" id="sp-phone-val" placeholder="Phone Number (254XXXXXXXXX)" value="2547">

        <button class="sp-pay-btn" id="sp-pay-submit">
          Pay KES <span id="sp-btn-amount">${minAmount}</span>
        </button>
        ${!isRequired ? `<button class="sp-skip-btn" id="sp-skip-dismiss">Keep Watching (Free / Tip Later)</button>` : ''}
      </div>
    `;

    // 2. Floating Badge Launcher (Tipping badge)
    floatingBtnEl = document.createElement('div');
    floatingBtnEl.className = 'sp-floating-drawer-btn hidden';
    floatingBtnEl.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
      Support Creator
    `;

    // 3. Sliding Drawer (Non-blocking tipping card)
    drawerEl = document.createElement('div');
    drawerEl.className = 'sp-drawer';
    drawerEl.innerHTML = `
      <button class="sp-drawer-close">&times;</button>
      <div class="sp-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
      </div>
      <div class="sp-creator-badge" id="sp-creator-badge-drawer" style="display: none;"></div>
      <div class="sp-title">Support this Creator</div>
      
      <!-- Web Monetization Active Banner -->
      <div class="sp-wm-status-banner" style="display:none;"></div>

      <div class="sp-desc" style="margin-bottom: 12px;">Send a custom tip to unlock premium perks or show appreciation.</div>
      
      <div class="sp-amount-group" style="padding: 8px 12px; margin-bottom:12px;">
        <span class="sp-amount-label">Tip Amount</span>
        <div class="sp-amount-input-wrapper">
          <span class="sp-currency" id="sp-currency-label-drawer">KES</span>
          <input type="number" class="sp-amount-input" id="sp-amount-val-drawer" value="${minAmount}" min="${minAmount}" step="0.5" style="font-size:16px; width:70px;">
        </div>
      </div>

      <div class="sp-methods-title">Select Method</div>
      <select class="sp-method-select" id="sp-methods-select-drawer" style="margin-bottom:12px; padding:10px; font-size:13px;">
        <option value="mpesa">M-Pesa (KE)</option>
        <option value="wallet">ShujaaPay Wallet [TESTNET]</option>
        <option value="usdc">USDC Stablecoin [TESTNET]</option>
      </select>

      <input type="tel" class="sp-input-phone" id="sp-phone-val-drawer" placeholder="Phone Number (254XXXXXXXXX)" value="2547" style="padding:10px; margin-bottom:12px; font-size:13px;">

      <button class="sp-pay-btn" id="sp-pay-submit-drawer" style="padding:12px; font-size:13px;">
        Send Tip <span id="sp-btn-amount-drawer">${minAmount}</span>
      </button>
    `;

    // Append to appropriate containers
    if (contentType === 'page' || !targetContainer) {
      document.body.appendChild(overlayEl);
    } else {
      targetContainer.appendChild(overlayEl);
    }
    
    document.body.appendChild(floatingBtnEl);
    document.body.appendChild(drawerEl);

    // Setup input listeners & sync values
    const amountValInput = overlayEl.querySelector('#sp-amount-val');
    const amountValDrawer = drawerEl.querySelector('#sp-amount-val-drawer');

    function syncAmounts(val) {
      if (amountValInput) amountValInput.value = val;
      if (amountValDrawer) amountValDrawer.value = val;
      
      const btnAmt = overlayEl.querySelector('#sp-btn-amount');
      const btnAmtDrawer = drawerEl.querySelector('#sp-btn-amount-drawer');
      
      if (btnAmt) btnAmt.textContent = val;
      if (btnAmtDrawer) btnAmtDrawer.textContent = val;
    }

    if (amountValInput) {
      amountValInput.addEventListener('input', function() {
        let val = parseFloat(this.value);
        if (isNaN(val) || val < minAmount) val = minAmount;
        syncAmounts(val.toFixed(2));
      });
    }

    if (amountValDrawer) {
      amountValDrawer.addEventListener('input', function() {
        let val = parseFloat(this.value);
        if (isNaN(val) || val < minAmount) val = minAmount;
        syncAmounts(val.toFixed(2));
      });
    }

    // Toggle drawer functionality
    floatingBtnEl.addEventListener('click', () => {
      drawerEl.classList.add('active');
      floatingBtnEl.classList.add('hidden');
    });

    const closeDrawerBtn = drawerEl.querySelector('.sp-drawer-close');
    if (closeDrawerBtn) {
      closeDrawerBtn.addEventListener('click', () => {
        drawerEl.classList.remove('active');
        floatingBtnEl.classList.remove('hidden');
      });
    }

    // Skip trigger (voluntary)
    const skipBtn = overlayEl.querySelector('#sp-skip-dismiss');
    if (skipBtn) {
      skipBtn.addEventListener('click', () => {
        closePaywall();
        // Show floating button so they can tip later
        floatingBtnEl.classList.remove('hidden');
      });
    }

    // 4. Create Simulated STK Push Dialog
    stkMockEl = document.getElementById('sp-stk-push-mock');
    if (!stkMockEl) {
      stkMockEl = document.createElement('div');
      stkMockEl.className = 'sp-stk-push-mock';
      stkMockEl.id = 'sp-stk-push-mock';
      stkMockEl.innerHTML = `
        <div class="sp-stk-header">
          <span>SIM Toolkit</span>
          <span>M-Pesa</span>
        </div>
        <div class="sp-stk-body">
          <div id="sp-stk-prompt-text" style="font-weight: 500; font-size: 11px; color: #334155; word-wrap: break-word;">Pay KES 1.00 to Creator?</div>
          <input type="password" class="sp-stk-input" id="sp-stk-pin" placeholder="Enter PIN" maxlength="4" autocomplete="off" inputmode="numeric">
        </div>
        <div class="sp-stk-footer">
          <button class="sp-stk-btn" id="sp-stk-cancel">Cancel</button>
          <button class="sp-stk-btn" id="sp-stk-send">Send</button>
        </div>
      `;
      document.body.appendChild(stkMockEl);
    }

    // Fetch Details & Geolocation configs
    fetch(`${gatewayUrl}/api/payment-links/${slug}/details`)
      .then(res => res.json())
      .then(details => {
        if (details.recipientName) {
          creatorName = details.recipientName;
          const creatorBadge = overlayEl.querySelector('#sp-creator-badge');
          const creatorBadgeDrawer = drawerEl.querySelector('#sp-creator-badge-drawer');
          if (creatorBadge) {
            creatorBadge.style.display = 'inline-block';
            creatorBadge.textContent = `By ${creatorName}`;
          }
          if (creatorBadgeDrawer) {
            creatorBadgeDrawer.style.display = 'inline-block';
            creatorBadgeDrawer.textContent = `By ${creatorName}`;
          }
        }

        if (details.currency) {
          currentCurrency = details.currency;
          const currencyLabel = overlayEl.querySelector('#sp-currency-label');
          const currencyLabelDrawer = drawerEl.querySelector('#sp-currency-label-drawer');
          if (currencyLabel) currencyLabel.textContent = currentCurrency;
          if (currencyLabelDrawer) currencyLabelDrawer.textContent = currentCurrency;
          
          const payBtnSubmit = overlayEl.querySelector('#sp-pay-submit');
          const payBtnSubmitDrawer = drawerEl.querySelector('#sp-pay-submit-drawer');
          
          if (payBtnSubmit) payBtnSubmit.innerHTML = `Pay ${escapeHTML(currentCurrency)} <span id="sp-btn-amount">${minAmount}</span>`;
          if (payBtnSubmitDrawer) payBtnSubmitDrawer.innerHTML = `Send Tip ${escapeHTML(currentCurrency)} <span id="sp-btn-amount-drawer">${minAmount}</span>`;
        }

        // Initialize Web Monetization link injection & SPSP streaming
        if (details.paymentPointer) {
          setupWebMonetization(details.paymentPointer);
        }

        const geoParam = defaultGeo ? `?geo=${defaultGeo}` : '';
        return fetch(`${gatewayUrl}/api/payment-links/${slug}/geo-methods${geoParam}`);
      })
      .then(res => res.json())
      .then(geoData => {
        const methods = geoData.methods || [];
        renderMethodsList(methods);
      })
      .catch(err => {
        console.warn('[ShujaaPay Paywall] Fetch details or geo-methods failed, using defaults.', err);
      });

    // Setup payment submit handlers
    const payBtn = overlayEl.querySelector('#sp-pay-submit');
    if (payBtn) payBtn.addEventListener('click', () => triggerPaymentFlow(payBtn, false));

    const payBtnDrawer = drawerEl.querySelector('#sp-pay-submit-drawer');
    if (payBtnDrawer) payBtnDrawer.addEventListener('click', () => triggerPaymentFlow(payBtnDrawer, true));

    // Setup change listeners on the select inputs unconditionally
    const selectEl = overlayEl.querySelector('#sp-methods-select');
    if (selectEl) {
      selectEl.addEventListener('change', function() {
        updateFormFields(this.value, false);
      });
    }

    const selectElDrawer = drawerEl.querySelector('#sp-methods-select-drawer');
    if (selectElDrawer) {
      selectElDrawer.addEventListener('change', function() {
        updateFormFields(this.value, true);
      });
    }

    // Initialize display with default options
    updateFormFields('mpesa', false);
    updateFormFields('mpesa', true);

    // Show floating trigger button straight away if configured to start as drawer
    if (startAsFloatingDrawer) {
      floatingBtnEl.classList.remove('hidden');
    }
  }

  function renderMethodsList(methods) {
    const selectEl = overlayEl.querySelector('#sp-methods-select');
    const selectElDrawer = drawerEl.querySelector('#sp-methods-select-drawer');

    function populate(element) {
      if (!element) return;
      element.innerHTML = '';
      methods.forEach((m) => {
        const flag = m.flag ? ` (${m.flag})` : '';
        const badge = (m.id === 'usdc' || m.id === 'wallet') ? ' [TESTNET]' : 
                      (m.id !== 'mpesa' && m.id !== 'bank' && m.id !== 'card') ? ' [SOON]' : '';
        
        const option = document.createElement('option');
        option.value = m.id;
        option.textContent = `${m.label}${badge}${flag}`;
        element.appendChild(option);
      });
    }

    populate(selectEl);
    populate(selectElDrawer);

    // Trigger default layout updates for the first loaded method
    if (methods.length > 0) {
      updateFormFields(methods[0].id, false);
      updateFormFields(methods[0].id, true);
    }
  }

  function updateFormFields(selectedMethod, isDrawer) {
    const parent = isDrawer ? drawerEl : overlayEl;
    const phoneInput = parent.querySelector('.sp-input-phone');
    const payBtn = parent.querySelector('.sp-pay-btn');
    const amountValInput = parent.querySelector('.sp-amount-input');

    if (!phoneInput || !payBtn) return;

    // Show/hide phone inputs
    const isMobileMoney = selectedMethod === 'mpesa' || selectedMethod === 'airtel' || selectedMethod === 'mtn' || selectedMethod === 'vodafone';
    phoneInput.style.display = isMobileMoney ? 'block' : 'none';
    if (selectedMethod === 'mpesa') {
      phoneInput.placeholder = 'M-Pesa Phone (254XXXXXXXXX)';
    } else {
      phoneInput.placeholder = 'Mobile Money Phone (254XXXXXXXXX)';
    }

    // Dynamic FX conversion
    const FX_RATES = {
      USD: 1.0,
      KES: 130.0,
      UGX: 3700.0,
      TZS: 2600.0,
      NGN: 1500.0,
      GHS: 14.5,
      RWF: 1300.0
    };

    function getCurrencyForMethod(method, country) {
      if (['usdc', 'wallet', 'card', 'btc', 'eth'].includes(method)) return 'USD';
      if (method === 'mpesa') {
        if (country === 'TZ') return 'TZS';
        if (country === 'ET') return 'ETB';
        return 'KES';
      }
      if (method === 'mtn') {
        if (country === 'GH') return 'GHS';
        if (country === 'RW') return 'RWF';
        return 'UGX';
      }
      if (method === 'airtel') {
        if (country === 'UG') return 'UGX';
        if (country === 'TZ') return 'TZS';
        if (country === 'NG') return 'NGN';
        if (country === 'RW') return 'RWF';
        return 'KES';
      }
      if (method === 'vodafone') return 'GHS';
      if (method === 'bank') return 'KES';
      return 'KES';
    }

    const targetCurrency = getCurrencyForMethod(selectedMethod, defaultGeo || 'KE');
    currentCurrency = targetCurrency;

    // Update currency label
    const currencyLabel = parent.querySelector('#sp-currency-label') || parent.querySelector('#sp-currency-label-drawer');
    if (currencyLabel) currencyLabel.textContent = targetCurrency;

    const rate = FX_RATES[targetCurrency] || 1.0;
    const baseAmount = parseFloat(scriptTag.getAttribute('data-amount') || '0.1');
    const convertedAmount = (baseAmount * rate).toFixed(targetCurrency === 'USD' || targetCurrency === 'GHS' ? 2 : 0);

    if (amountValInput) {
      amountValInput.value = convertedAmount;
      amountValInput.min = convertedAmount;
    }

    // Enable/disable based on implementation status
    const isSoon = selectedMethod !== 'mpesa' && selectedMethod !== 'bank' && selectedMethod !== 'card' && selectedMethod !== 'usdc' && selectedMethod !== 'wallet';
    payBtn.disabled = isSoon;

    if (isSoon) {
      payBtn.textContent = 'Coming Soon';
    } else {
      const amount = amountValInput ? amountValInput.value : convertedAmount;
      if (isDrawer) {
        payBtn.innerHTML = `Send Tip ${escapeHTML(currentCurrency)} <span id="sp-btn-amount-drawer">${amount}</span>`;
      } else {
        payBtn.innerHTML = `Pay ${escapeHTML(currentCurrency)} <span id="sp-btn-amount">${amount}</span>`;
      }
    }
  }

  function triggerPaymentFlow(buttonEl, isDrawer) {
    const parent = isDrawer ? drawerEl : overlayEl;
    const selectEl = parent.querySelector('.sp-method-select');
    const selectedMethod = selectEl ? selectEl.value : 'mpesa';
    const amountInput = parent.querySelector('.sp-amount-input');
    const amount = parseFloat(amountInput ? amountInput.value : minAmount);

    const phoneInput = parent.querySelector('.sp-input-phone');
    let phone = phoneInput ? phoneInput.value.trim() : '';

    const isMobileMoney = selectedMethod === 'mpesa' || selectedMethod === 'airtel' || selectedMethod === 'mtn' || selectedMethod === 'vodafone';

    if (isMobileMoney) {
      // Clean up phone number format (remove spaces, plus, dashes, brackets)
      phone = phone.replace(/[\s\+\-\(\)]/g, '');
      if (phone.startsWith('0')) {
        phone = '254' + phone.slice(1);
      }
      if (!phone || !/^254\d{9}$/.test(phone)) {
        alert('Please enter a valid phone number (254XXXXXXXXX)');
        return;
      }
    }

    buttonEl.disabled = true;
    buttonEl.innerHTML = `<div class="sp-spinner"></div> Initializing...`;

    // Fire checkout request
    const token = localStorage.getItem('shujaapay_token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    fetch(`${gatewayUrl}/api/payment-links/${slug}/pay`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        phoneNumber: isMobileMoney ? (phone || undefined) : undefined,
        customAmount: amount,
        payMethod: selectedMethod,
        message: 'Content Paywall unlock'
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        alert(`Payment initialization failed: ${data.message || data.error}`);
        buttonEl.disabled = false;
        updateFormFields(selectedMethod, isDrawer);
        return;
      }

      if (data.status === 'COMPLETED') {
        hasPaid = true;
        buttonEl.style.background = '#10b981';
        buttonEl.style.color = '#0f172a';
        buttonEl.innerHTML = `Ô£ô Payment Verified`;
        setTimeout(() => {
          closePaywall();
        }, 1500);
        return;
      }

      const checkoutId = data.checkoutRequestId;
      buttonEl.innerHTML = `<div class="sp-spinner"></div> Authorizing STK...`;

      let poller = null;
      function startStatusPolling() {
        let pollAttempts = 0;
        poller = setInterval(() => {
          pollAttempts++;
          if (pollAttempts > 60) {
            clearInterval(poller);
            alert('Verification timed out. Check phone notifications.');
            buttonEl.disabled = false;
            updateFormFields(selectedMethod, isDrawer);
            return;
          }

          fetch(`${gatewayUrl}/api/payments/public-status/${checkoutId}`)
            .then(res => res.json())
            .then(statusData => {
              if (statusData.status === 'COMPLETED') {
                clearInterval(poller);
                hasPaid = true;
                buttonEl.style.background = '#10b981';
                buttonEl.style.color = '#0f172a';
                buttonEl.innerHTML = `Ô£ô Payment Verified`;
                setTimeout(() => {
                  closePaywall();
                }, 1500);
              } else if (statusData.status === 'FAILED') {
                clearInterval(poller);
                alert('Payment declined or failed.');
                buttonEl.disabled = false;
                updateFormFields(selectedMethod, isDrawer);
              }
            })
            .catch(() => {});
        }, 2000);
      }

      if (data.isMock || data.message?.includes('SIMULATION')) {
        const promptText = stkMockEl.querySelector('#sp-stk-prompt-text');
        if (promptText) {
          promptText.textContent = `Pay ${currentCurrency} ${amount.toFixed(2)} to ${creatorName || 'ShujaaPay Creator'}?`;
        }
        const pinInput = stkMockEl.querySelector('#sp-stk-pin');
        if (pinInput) {
          pinInput.value = '';
          setTimeout(() => pinInput.focus(), 100);
        }
        stkMockEl.classList.add('active');

        const sendBtn = stkMockEl.querySelector('#sp-stk-send');
        const cancelBtn = stkMockEl.querySelector('#sp-stk-cancel');

        const handleSend = () => {
          stkMockEl.classList.remove('active');
          buttonEl.innerHTML = `<div class="sp-spinner"></div> Verifying SIM PIN...`;
          startStatusPolling();
          cleanupListeners();
        };

        const handleCancel = () => {
          stkMockEl.classList.remove('active');
          buttonEl.disabled = false;
          updateFormFields(selectedMethod, isDrawer);
          cleanupListeners();
        };

        const handleKeyPress = (e) => {
          if (e.key === 'Enter') handleSend();
        };

        function cleanupListeners() {
          sendBtn.removeEventListener('click', handleSend);
          cancelBtn.removeEventListener('click', handleCancel);
          if (pinInput) pinInput.removeEventListener('keypress', handleKeyPress);
        }

        sendBtn.addEventListener('click', handleSend);
        cancelBtn.addEventListener('click', handleCancel);
        if (pinInput) pinInput.addEventListener('keypress', handleKeyPress);
      } else {
        startStatusPolling();
      }
    })
    .catch(err => {
      alert(`Network error during payment: ${err.message}`);
      buttonEl.disabled = false;
      updateFormFields(selectedMethod, isDrawer);
    });
  }

  function showPaywall() {
    isModalOpen = true;

    // Handle video and audio locking
    if ((contentType === 'video' || contentType === 'audio') && mediaEl) {
      mediaEl.pause();
      mediaEl.controls = false;
      overlayEl.classList.add('active');
    } 
    // Handle live session container overlays (No Pause!)
    else if (contentType === 'live' && targetContainer) {
      if (isRequired) {
        // Blur stream content but don't pause it
        const childStreams = targetContainer.querySelectorAll('video, audio, iframe, object, embed');
        childStreams.forEach(stream => {
          stream.classList.add('sp-blur-content');
        });
        overlayEl.classList.add('active');
      } else {
        // Voluntary tip: show floating trigger button
        floatingBtnEl.classList.remove('hidden');
      }
    }
    // Handle custom elements, downloads, interactive widgets
    else if ((contentType === 'element' || contentType === 'download' || contentType === 'interactive') && targetContainer) {
      // Blur element inner contents
      Array.from(targetContainer.children).forEach(child => {
        if (child !== overlayEl && child !== drawerEl && child !== floatingBtnEl) {
          child.classList.add('sp-blur-content');
        }
      });
      overlayEl.classList.add('active');
    }
    // Handle full page
    else if (contentType === 'page') {
      if (isRequired) {
        document.body.style.overflow = 'hidden';
        overlayEl.classList.add('active');
      } else {
        floatingBtnEl.classList.remove('hidden');
      }
    }
  }

  function closePaywall() {
    isModalOpen = false;

    // Clean overlays
    overlayEl.classList.remove('active');
    drawerEl.classList.remove('active');
    floatingBtnEl.classList.add('hidden');

    // Restore scroll
    if (contentType === 'page') {
      document.body.style.overflow = '';
    }

    // Unpause video/audio
    if ((contentType === 'video' || contentType === 'audio') && mediaEl) {
      mediaEl.controls = true;
      mediaEl.play().catch(() => {});
    }

    // Remove blur filters
    if (targetContainer) {
      const blurred = targetContainer.querySelectorAll('.sp-blur-content');
      blurred.forEach(el => el.classList.remove('sp-blur-content'));
      
      // Also check immediate children
      Array.from(targetContainer.children).forEach(child => {
        child.classList.remove('sp-blur-content');
      });
    }
  }

  // Bind DOM content load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
