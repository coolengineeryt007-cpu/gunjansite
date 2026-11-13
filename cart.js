/**
 * Maison Yojaki E-Commerce Unified Cart Engine
 * Manages cart state in localStorage, header counters, and slide-out cart drawer across all pages.
 */

const CART_STORAGE_KEY = 'yojaki_cart_items';
const COUPON_STORAGE_KEY = 'yojaki_applied_coupon';

// Initial curated state if cart is completely empty
const INITIAL_DEMO_CART = [
  {
    id: 'thander-50ml',
    name: 'THANDER',
    subtitle: 'Stormy Woods & Dark Marine',
    price: 2499,
    originalPrice: 4999,
    size: '50 ML',
    image: 'Product 4.jpeg',
    quantity: 1,
    url: 'product-thander.html'
  },
  {
    id: 'discovery-set',
    name: 'THE DISCOVERY SET',
    subtitle: 'All Four Fragrances (4 x 25 ml)',
    price: 1299,
    originalPrice: 1999,
    size: '4 x 25 ML',
    image: 'Logo.png',
    quantity: 1,
    url: 'product-discovery-set.html'
  }
];

function getCart() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(INITIAL_DEMO_CART));
      return [...INITIAL_DEMO_CART];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [...INITIAL_DEMO_CART];
  }
}

function saveCart(cart) {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    updateCartBadges();
    renderCartDrawer();
  } catch (e) {
    console.error('Failed to save cart to localStorage', e);
  }
}

function addToCart(item, openDrawer = true) {
  const cart = getCart();
  const existing = cart.find(i => i.id === item.id);
  if (existing) {
    existing.quantity += (item.quantity || 1);
  } else {
    cart.push({
      id: item.id,
      name: item.name,
      subtitle: item.subtitle || 'Haute Parfumerie',
      price: item.price,
      originalPrice: item.originalPrice || (item.price * 2),
      size: item.size || '50 ML',
      image: item.image,
      quantity: item.quantity || 1,
      url: item.url || 'shop.html'
    });
  }
  saveCart(cart);
  showToast(`Added "${item.name}" to your bag`);
  if (openDrawer) {
    openCartDrawer();
  }
}

function updateCartQuantity(id, delta) {
  const cart = getCart();
  const item = cart.find(i => i.id === id);
  if (item) {
    item.quantity += delta;
    if (item.quantity <= 0) {
      removeFromCart(id);
      return;
    }
    saveCart(cart);
  }
}

function removeFromCart(id) {
  let cart = getCart();
  cart = cart.filter(i => i.id !== id);
  saveCart(cart);
}

function clearCart() {
  saveCart([]);
}

function getCartTotals() {
  const cart = getCart();
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  
  // Applied coupon logic
  const coupon = localStorage.getItem(COUPON_STORAGE_KEY) || 'AMENCA50';
  let discount = 0;
  if (coupon === 'AMENCA50') {
    discount = Math.round(subtotal * 0.5); // 50% sitewide festive offer
  }
  
  const shipping = subtotal > 0 ? 0 : 0; // Free express shipping
  const grandTotal = Math.max(0, subtotal - discount + shipping);

  return {
    cart,
    subtotal,
    discount,
    shipping,
    grandTotal,
    totalItems,
    coupon
  };
}

function updateCartBadges() {
  const totals = getCartTotals();
  const badges = document.querySelectorAll('.cart-count-badge, #amenca-cart-count');
  badges.forEach(badge => {
    badge.textContent = totals.totalItems;
  });
}

function formatINR(num) {
  return '₹' + Number(num).toLocaleString('en-IN');
}

/* Toast Notification */
function showToast(message) {
  let container = document.getElementById('yojaki-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'yojaki-toast-container';
    container.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:999999;display:flex;flex-direction:column;gap:10px;pointer-events:none;';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.style.cssText = 'background:#2A1320;color:#F0E4D3;border:1px solid #D4A94A;border-radius:9999px;padding:12px 24px;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;box-shadow:0 10px 30px rgba(0,0,0,0.8);transform:translateY(20px);opacity:0;transition:all 0.3s cubic-bezier(0.16,1,0.3,1);display:flex;align-items:center;gap:12px;pointer-events:auto;';
  toast.innerHTML = `<span style="color:#D4A94A;">✦</span><span>${message}</span>`;
  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.transform = 'translateY(0)';
    toast.style.opacity = '1';
  });

  setTimeout(() => {
    toast.style.transform = 'translateY(20px)';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 350);
  }, 2800);
}

/* Slide-out Cart Drawer DOM creation & handling */
function ensureCartDrawer() {
  if (document.getElementById('CartDrawer')) return;

  const drawerHTML = `
  <div id="CartDrawerOverlay" onclick="closeCartDrawer()" style="position:fixed;inset:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(4px);z-index:99998;opacity:0;pointer-events:none;transition:opacity 0.35s ease;"></div>
  <aside id="CartDrawer" style="position:fixed;top:0;right:0;bottom:0;width:min(90vw,440px);background:#2A1320;color:#F0E4D3;border-left:1px solid rgba(212,169,74,0.3);z-index:99999;transform:translateX(100%);transition:transform 0.35s cubic-bezier(0.16,1,0.3,1);display:flex;flex-direction:column;box-shadow:-10px 0 40px rgba(0,0,0,0.85);">
    <!-- Drawer Header -->
    <div style="padding:22px;border-bottom:1px solid rgba(212,169,74,0.25);display:flex;align-items:center;justify-content:space-between;">
      <div style="display:flex;align-items:center;gap:10px;">
        <span style="font-size:12px;letter-spacing:0.3em;text-transform:uppercase;color:#D4A94A;font-weight:600;">SHOPPING BAG</span>
        <span style="font-size:11px;color:rgba(240,228,211,0.6);font-family:monospace;">(<span class="cart-count-badge">0</span>)</span>
      </div>
      <button onclick="closeCartDrawer()" aria-label="Close Bag" style="background:none;border:none;color:#F0E4D3;font-size:22px;cursor:pointer;padding:4px;display:flex;align-items:center;justify-content:center;">✕</button>
    </div>

    <!-- Free Dispatch Banner -->
    <div style="background:rgba(212,169,74,0.12);padding:10px 20px;border-bottom:1px solid rgba(212,169,74,0.15);font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#D4A94A;text-align:center;">
      ✨ COMPLIMENTARY EXPRESS DISPATCH APPLIED
    </div>

    <!-- Drawer Items List -->
    <div id="CartDrawerItems" style="flex:1;overflow-y:auto;padding:20px;display:flex;flex-direction:column;gap:18px;">
      <!-- Populated dynamically -->
    </div>

    <!-- Drawer Footer -->
    <div style="padding:22px;border-top:1px solid rgba(212,169,74,0.25);background:rgba(31,11,23,0.95);">
      <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(240,228,211,0.7);">
        <span>Subtotal</span>
        <span id="drawer-subtotal">₹0</span>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:16px;font-size:12px;letter-spacing:0.2em;text-transform:uppercase;color:#D4A94A;font-weight:600;">
        <span>Atelier Total (50% Off)</span>
        <span id="drawer-total" style="font-size:16px;">₹0</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px;">
        <a href="checkout.html" class="gold-pill-btn" style="width:100%;text-align:center;padding:0.9rem;font-size:10px;">PROCEED TO CHECKOUT</a>
        <a href="cart.html" style="text-align:center;font-size:10px;letter-spacing:0.25em;text-transform:uppercase;color:rgba(240,228,211,0.7);padding:8px 0;" onmouseover="this.style.color='#D4A94A'" onmouseout="this.style.color='rgba(240,228,211,0.7)'">VIEW COMPLETE SHOPPING BAG →</a>
      </div>
    </div>
  </aside>
  `;

  document.body.insertAdjacentHTML('beforeend', drawerHTML);
}

function openCartDrawer() {
  ensureCartDrawer();
  renderCartDrawer();
  const drawer = document.getElementById('CartDrawer');
  const overlay = document.getElementById('CartDrawerOverlay');
  if (drawer && overlay) {
    drawer.style.transform = 'translateX(0)';
    overlay.style.opacity = '1';
    overlay.style.pointerEvents = 'auto';
  }
}

function closeCartDrawer() {
  const drawer = document.getElementById('CartDrawer');
  const overlay = document.getElementById('CartDrawerOverlay');
  if (drawer && overlay) {
    drawer.style.transform = 'translateX(100%)';
    overlay.style.opacity = '0';
    overlay.style.pointerEvents = 'none';
  }
}

function renderCartDrawer() {
  const container = document.getElementById('CartDrawerItems');
  if (!container) return;

  const totals = getCartTotals();
  const drawerSubtotal = document.getElementById('drawer-subtotal');
  const drawerTotal = document.getElementById('drawer-total');

  if (drawerSubtotal) drawerSubtotal.textContent = formatINR(totals.subtotal);
  if (drawerTotal) drawerTotal.textContent = formatINR(totals.grandTotal);

  if (totals.cart.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:40px 10px;color:rgba(240,228,211,0.6);">
        <div style="font-size:32px;margin-bottom:12px;opacity:0.4;">✦</div>
        <p style="font-size:12px;letter-spacing:0.25em;text-transform:uppercase;margin-bottom:20px;">Your shopping bag is empty</p>
        <a href="shop.html" onclick="closeCartDrawer()" class="gold-pill-btn" style="padding:0.65rem 1.6rem;font-size:9px;">DISCOVER THE COLLECTION</a>
      </div>
    `;
    return;
  }

  container.innerHTML = totals.cart.map(item => `
    <div style="display:flex;gap:14px;align-items:center;padding-bottom:16px;border-bottom:1px solid rgba(212,169,74,0.15);">
      <div style="width:68px;height:68px;border:1px solid rgba(212,169,74,0.3);background:rgba(0,0,0,0.4);border-radius:6px;overflow:hidden;flex-shrink:0;display:flex;align-items:center;justify-content:center;padding:4px;">
        <img src="${item.image}" alt="${item.name}" style="max-width:100%;max-height:100%;object-fit:contain;">
      </div>
      <div style="flex:1;min-width:0;">
        <h4 style="font-family:'Cinzel',serif;font-size:13px;letter-spacing:0.18em;text-transform:uppercase;color:#F0E4D3;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${item.name}</h4>
        <div style="font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:#D4A94A;margin-bottom:8px;">${item.size} · ${formatINR(item.price)}</div>
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="display:inline-flex;align-items:center;border:1px solid rgba(212,169,74,0.35);border-radius:9999px;padding:2px 8px;gap:8px;font-size:11px;">
            <button onclick="updateCartQuantity('${item.id}', -1)" style="background:none;border:none;color:#F0E4D3;cursor:pointer;padding:0 2px;">-</button>
            <span style="font-family:monospace;min-width:14px;text-align:center;">${item.quantity}</span>
            <button onclick="updateCartQuantity('${item.id}', 1)" style="background:none;border:none;color:#F0E4D3;cursor:pointer;padding:0 2px;">+</button>
          </div>
          <button onclick="removeFromCart('${item.id}')" style="background:none;border:none;color:rgba(240,228,211,0.45);cursor:pointer;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;" onmouseover="this.style.color='#D4A94A'" onmouseout="this.style.color='rgba(240,228,211,0.45)'">Remove</button>
        </div>
      </div>
      <div style="text-align:right;flex-shrink:0;">
        <div style="font-size:13px;font-weight:600;color:#F0E4D3;">${formatINR(item.price * item.quantity)}</div>
      </div>
    </div>
  `).join('');
}

// Global initialization
document.addEventListener('DOMContentLoaded', () => {
  ensureCartDrawer();
  updateCartBadges();
  renderCartDrawer();

  // Attach click listeners to any generic cart button
  document.querySelectorAll('[data-open-cart]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      openCartDrawer();
    });
  });
});

