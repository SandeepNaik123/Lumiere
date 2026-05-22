/* =============================================
   CART
============================================= */
var cart = {};
var activeCategory = 'all';

function increase(name, price) {
    if (!cart[name]) cart[name] = { qty: 0, price: price };
    cart[name].qty++;
    var el = document.getElementById('qty-' + name);
    if (el) el.innerText = cart[name].qty;
    update();
}

function decrease(name) {
    if (cart[name]) {
        cart[name].qty--;
        if (cart[name].qty <= 0) {
            delete cart[name];
            var el = document.getElementById('qty-' + name);
            if (el) el.innerText = 0;
        } else {
            var el = document.getElementById('qty-' + name);
            if (el) el.innerText = cart[name].qty;
        }
    }
    update();
}

function update() {
    var orders = document.getElementById('orders');
    var total = 0, count = 0, html = '';
    for (var i in cart) {
        total += cart[i].qty * cart[i].price;
        count += cart[i].qty;
        html += '<div class="cart-item"><div>' + i + '</div><div>x' + cart[i].qty + '</div></div>';
    }
    if (orders) orders.innerHTML = html;
    var t = document.getElementById('total'); if (t) t.innerText = total;
    var ct = document.getElementById('cart-total'); if (ct) ct.innerText = total;
    var cc = document.getElementById('cart-count'); if (cc) cc.innerText = count + ' Items';
    ['navCartBadge', 'navCartBadge2'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) { el.textContent = count; el.style.display = count > 0 ? 'flex' : 'none'; }
    });
}

function clearCart() { cart = {}; update(); }

function openCart() {
    var s = document.querySelector('.summary');
    if (!s) return;
    if (window.innerWidth <= 900) {
        if (s.classList.contains('active')) {
            s.classList.remove('active');
            setTimeout(function() { s.style.display = 'none'; }, 400);
        } else {
            s.style.display = 'block';
            setTimeout(function() { s.classList.add('active'); }, 10);
        }
    }
}

/* =============================================
   PLACE ORDER  (handles both Dine-In & Delivery)
============================================= */
function placeOrder() {
    if (!cart || Object.keys(cart).length === 0) {
        alert('Your cart is empty!');
        return;
    }

    var isDelivery = (window.orderMode === 'delivery');
    var table = new URLSearchParams(window.location.search).get('table') || '';

    if (!isDelivery && !table) {
        alert('No table number found. Please scan your table QR code.');
        return;
    }

    if (isDelivery) {
        var loggedInUser = localStorage.getItem('lumiere_user');
        if (!loggedInUser) {
            var summary = document.querySelector('.summary');
            if (summary && window.innerWidth <= 900) {
                summary.classList.remove('active');
                setTimeout(function() { summary.style.display = 'none'; }, 300);
            }
            openLoginModal('login');
            setTimeout(function() {
                var hint = document.querySelector('.login-hint');
                if (hint) {
                    hint.textContent = 'Please sign in to place your delivery order.';
                    hint.style.color = '#c8a96a';
                }
            }, 100);
            return;
        }
        var savedRaw = localStorage.getItem('lumiere_delivery_address');
        if (!savedRaw) {
            alert('Please set a delivery address first.');
            openDeliveryModal();
            return;
        }
    }

    var items = Object.keys(cart).map(function(name) {
        return { name: name, qty: cart[name].qty, price: cart[name].price, subtotal: cart[name].qty * cart[name].price };
    });

    var total = items.reduce(function(sum, i) { return sum + i.subtotal; }, 0);
    var noteEl = document.getElementById('orderNote');
    var note = noteEl ? noteEl.value.trim() : '';
    var btn = document.querySelector('.place');
    btn.disabled = true;
    btn.textContent = 'Placing…';

    var payload = { items: items, total: total, note: note, order_type: isDelivery ? 'delivery' : 'dinein' };
    if (isDelivery) {
        var addrData = JSON.parse(localStorage.getItem('lumiere_delivery_address'));
        payload.delivery_address = addrData.address;
        payload.address_type = addrData.type;
        payload.customer_name = localStorage.getItem('lumiere_user') || 'Customer';
    } else {
        payload.table = table;
    }

    fetch('/place-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
        btn.disabled = false;
        btn.textContent = isDelivery ? 'Place Delivery Order' : 'Place Order';
        if (data.success) {
            if (noteEl) noteEl.value = '';
            showOrderSuccess(data.order_id, isDelivery);
            clearCart();
            if (!isDelivery) {
                var billBtn = document.getElementById('requestBillBtn');
                if (billBtn) { billBtn.disabled = false; billBtn.style.opacity = '1'; billBtn.style.cursor = 'pointer'; billBtn.innerHTML = '🧾 Request Bill'; }
            }
        } else { alert('Something went wrong. Please try again.'); }
    })
    .catch(function() {
        btn.disabled = false;
        btn.textContent = isDelivery ? 'Place Delivery Order' : 'Place Order';
        alert('Network error. Please try again.');
    });
}

function showOrderSuccess(orderId, isDelivery) {
    var existing = document.getElementById('orderSuccessOverlay');
    if (existing) existing.remove();

    if (!document.getElementById('lumiere-anim-style')) {
        var style = document.createElement('style');
        style.id = 'lumiere-anim-style';
        style.textContent =
            '@keyframes overlayFadeIn{from{opacity:0}to{opacity:1}}' +
            '@keyframes cardPopIn{from{transform:scale(0.82) translateY(20px);opacity:0}to{transform:scale(1) translateY(0);opacity:1}}';
        document.head.appendChild(style);
    }

    var msg = isDelivery
        ? 'Your order has been placed!<br>We will deliver it to your address shortly. \u{1F6F5}'
        : "Your order is being prepared.<br>We'll serve it to your table shortly. \u{1F37D}\uFE0F";
    var icon = isDelivery ? '\u{1F6F5}' : '\u2705';

    var overlay = document.createElement('div');
    overlay.id = 'orderSuccessOverlay';
    overlay.style.cssText =
        'position:fixed;inset:0;background:rgba(0,0,0,0.88);z-index:99999;' +
        'display:flex;align-items:center;justify-content:center;' +
        'animation:overlayFadeIn .25s ease;';

    overlay.innerHTML = [
        '<div style="background:#111;border:1px solid #c8a96a;border-radius:18px;',
        'padding:44px 36px;text-align:center;max-width:360px;width:88%;',
        'animation:cardPopIn .35s cubic-bezier(.34,1.56,.64,1);',
        'box-shadow:0 0 80px rgba(200,169,106,0.12);">',
            '<div style="font-size:58px;margin-bottom:14px;line-height:1;">' + icon + '</div>',
            '<h2 style="color:#c8a96a;font-family:\'Cormorant Garamond\',serif;',
            'font-size:28px;margin:0 0 8px;font-weight:600;letter-spacing:.5px;">Order Placed!</h2>',
            '<p style="color:#666;font-size:11px;margin:0 0 4px;letter-spacing:1.5px;text-transform:uppercase;">Order Number</p>',
            '<p style="color:#eee;font-size:24px;font-family:\'Cormorant Garamond\',serif;',
            'margin:0 0 16px;font-weight:600;">#' + orderId + '</p>',
            '<div style="border-top:1px solid #222;border-bottom:1px solid #222;margin:0 0 22px;padding:14px 0;">',
                '<p style="color:#aaa;font-size:13px;margin:0;line-height:1.8;">' + msg + '</p>',
            '</div>',
            '<button onclick="document.getElementById(\'orderSuccessOverlay\').remove()"',
            ' onmouseover="this.style.opacity=\'0.82\'"',
            ' onmouseout="this.style.opacity=\'1\'"',
            ' style="background:#c8a96a;color:#000;border:none;',
            'padding:12px 40px;border-radius:8px;font-size:14px;font-weight:700;',
            'cursor:pointer;letter-spacing:.5px;transition:opacity .2s;">Done</button>',
        '</div>'
    ].join('');

    document.body.appendChild(overlay);

    var summary = document.querySelector('.summary');
    if (summary && window.innerWidth <= 900) {
        summary.classList.remove('active');
        setTimeout(function() { summary.style.display = 'none'; }, 300);
    }
}


/* =============================================
   REQUEST BILL
============================================= */
function requestBill() {
    var table = new URLSearchParams(window.location.search).get('table') || '';
    if (!table) {
        alert('No table number found. Please scan your table QR code.');
        return;
    }

    var btn = document.getElementById('requestBillBtn');
    btn.disabled = true;
    btn.textContent = 'Requesting…';

    fetch('/request-bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: table })
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
        if (data.success) {
            showBillRequestedConfirm();
        } else {
            alert('Could not send bill request. Please try again.');
            btn.disabled = false;
            btn.textContent = '🧾 Request Bill';
        }
    })
    .catch(function() {
        alert('Network error. Please try again.');
        btn.disabled = false;
        btn.textContent = '🧾 Request Bill';
    });
}

function showBillRequestedConfirm() {
    var existing = document.getElementById('billConfirmOverlay');
    if (existing) existing.remove();

    var overlay = document.createElement('div');
    overlay.id = 'billConfirmOverlay';
    overlay.style.cssText =
        'position:fixed;inset:0;background:rgba(0,0,0,0.88);z-index:99999;' +
        'display:flex;align-items:center;justify-content:center;' +
        'animation:overlayFadeIn .25s ease;';

    overlay.innerHTML =
        '<div style="' +
            'background:#111;border:1px solid #c8a96a;border-radius:18px;' +
            'padding:40px 32px;text-align:center;max-width:340px;width:88%;' +
            'animation:cardPopIn .35s cubic-bezier(.34,1.56,.64,1);' +
            'box-shadow:0 0 80px rgba(200,169,106,0.12);">' +
            '<div style="font-size:52px;margin-bottom:14px;line-height:1;">🧾</div>' +
            '<h2 style="' +
                'color:#c8a96a;font-family:\'Cormorant Garamond\',serif;' +
                'font-size:26px;margin:0 0 10px;font-weight:600;letter-spacing:.5px;">' +
                'Bill Requested!' +
            '</h2>' +
            '<div style="border-top:1px solid #222;border-bottom:1px solid #222;margin:0 0 22px;padding:14px 0;">' +
                '<p style="color:#aaa;font-size:13px;margin:0;line-height:1.8;">' +
                    'Your bill is being prepared.<br>' +
                    'Our team will be with you shortly. 🙏' +
                '</p>' +
            '</div>' +
            '<button ' +
                'onclick="document.getElementById(\'billConfirmOverlay\').remove()" ' +
                'onmouseover="this.style.opacity=\'0.82\'" ' +
                'onmouseout="this.style.opacity=\'1\'" ' +
                'style="' +
                    'background:#c8a96a;color:#000;border:none;' +
                    'padding:11px 36px;border-radius:8px;' +
                    'font-size:14px;font-weight:700;cursor:pointer;' +
                    'letter-spacing:.5px;transition:opacity .2s;">' +
                'OK' +
            '</button>' +
        '</div>';

    document.body.appendChild(overlay);

    var btn = document.getElementById('requestBillBtn');
    if (btn) {
        btn.disabled = true;
        btn.style.opacity = '0.5';
        btn.style.cursor = 'default';
        btn.innerHTML = '✅ Bill Requested';
    }
}

/* =============================================
   TABLE NUMBER FROM URL
============================================= */
function getTableFromURL() {
    var params = new URLSearchParams(window.location.search);
    return params.get('table') || '';
}

function setTableDisplay() {
    var table = getTableFromURL();
    var els = document.querySelectorAll('.nav-table-num');
    els.forEach(function(el) {
        if (table) {
            el.textContent = 'Table ' + table;
            el.style.display = 'flex';
        } else {
            el.style.display = 'none';
        }
    });
}

/* =============================================
   SEARCH
============================================= */
function searchFood(value) {
    var search = value.toLowerCase().trim();
    ['landingSearchInput', 'stickySearchInput'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el && el.value !== value) el.value = value;
    });
    document.querySelectorAll('.item').forEach(function(item) {
        var nameEl = item.querySelector('h3');
        var descEl = item.querySelector('.item-desc');
        var name = nameEl ? nameEl.innerText.toLowerCase() : '';
        var desc = descEl ? descEl.innerText.toLowerCase() : '';
        var category = item.getAttribute('data-category') || '';
        var matchSearch = search === '' || name.includes(search) || desc.includes(search);
        var matchCat = (activeCategory === 'all' || category === activeCategory);
        item.style.display = (matchSearch && matchCat) ? 'block' : 'none';
    });
    updateSubheadings();
}

/* =============================================
   CATEGORY FILTER
============================================= */
function filterCategory(cat) {
    activeCategory = cat;
    document.querySelectorAll('.section').forEach(function(s) { s.style.display = 'none'; });
    if (cat === 'all') {
        document.querySelectorAll('.section').forEach(function(s) { s.style.display = 'block'; });
    } else {
        var section = document.getElementById('section-' + cat);
        if (section) section.style.display = 'block';
    }
    var search = '';
    var si = document.getElementById('landingSearchInput');
    if (si) search = si.value.toLowerCase();
    document.querySelectorAll('.item').forEach(function(item) {
        var nameEl = item.querySelector('h3');
        var name = nameEl ? nameEl.innerText.toLowerCase() : '';
        var category = item.getAttribute('data-category') || '';
        var matchSearch = name.includes(search);
        var matchCat = (cat === 'all' || category === cat);
        item.style.display = (matchSearch && matchCat) ? 'block' : 'none';
    });
    updateSubheadings();
}

function updateSubheadings() {
    document.querySelectorAll('.item-groups').forEach(function(group) {
        var heading = group.previousElementSibling;
        var visible = Array.from(group.querySelectorAll('.item')).filter(function(i) {
            return i.style.display !== 'none';
        });
        if (heading && heading.classList.contains('subheading')) {
            heading.style.display = visible.length > 0 ? 'block' : 'none';
        }
    });
}

/* =============================================
   EXPAND CARD
============================================= */
function toggleExpand(el) {
    if (el.classList.contains('expanded')) { el.classList.remove('expanded'); return; }
    document.querySelectorAll('.item.expanded').forEach(function(c) { c.classList.remove('expanded'); });
    el.classList.add('expanded');
    setTimeout(function() { el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 50);
}

/* =============================================
   MOBILE MENUS
============================================= */
function toggleMenu() {
    var m = document.getElementById('mobileMenu');
    if (m) m.classList.toggle('open');
}
function toggleLandingMenu() {
    document.getElementById('landingMobileMenu').classList.toggle('open');
}

/* =============================================
   BOTTOM DRAWER MENU
============================================= */
function toggleBottomMenu() {
    document.getElementById('floatMenuBtn').classList.toggle('open');
}
document.addEventListener('click', function(e) {
    var bar = document.getElementById('floatMenuBtn');
    if (bar && !bar.contains(e.target)) bar.classList.remove('open');
});
function drawerFilter(cat) {
    document.querySelectorAll('.bm-cat').forEach(function(b) { b.classList.remove('active'); });
    var ab = document.getElementById('bmc-' + cat);
    if (ab) ab.classList.add('active');
    filterCategory(cat);
    setTimeout(function() { document.getElementById('floatMenuBtn').classList.remove('open'); }, 320);
}

/* =============================================
   PROFILE DROPDOWN
============================================= */
function toggleProfileMenu(id) {
    var target = document.getElementById(id);
    document.querySelectorAll('.profile-dropdown').forEach(function(d) {
        if (d.id !== id) d.classList.remove('open');
    });
    if (target) target.classList.toggle('open');
}
document.addEventListener('click', function(e) {
    if (!e.target.closest('.nav-profile-wrap')) {
        document.querySelectorAll('.profile-dropdown').forEach(function(d) { d.classList.remove('open'); });
    }
});

/* =============================================
   LOGIN MODAL
============================================= */
function openLoginModal(tab) {
    document.getElementById('loginModal').classList.add('open');
    document.getElementById('loginModalOverlay').classList.add('open');
    document.querySelectorAll('.profile-dropdown').forEach(function(d) { d.classList.remove('open'); });
    switchTab(tab || 'login');
}
function closeLoginModal() {
    document.getElementById('loginModal').classList.remove('open');
    document.getElementById('loginModalOverlay').classList.remove('open');
}
function switchTab(tab) {
    document.querySelectorAll('.login-tab').forEach(function(t) { t.classList.remove('active'); });
    var tabEl = document.querySelector('.login-tab[onclick="switchTab(\'' + tab + '\')"]');
    if (tabEl) tabEl.classList.add('active');
    document.getElementById('loginForm').style.display = tab === 'login' ? 'block' : 'none';
    document.getElementById('registerForm').style.display = tab === 'register' ? 'block' : 'none';
}
function handleLogin() {
    var nameEl = document.querySelector('#loginForm input[type="text"]');
    var userName = (nameEl && nameEl.value.trim()) ? nameEl.value.trim() : 'User';
    updateProfileUI(userName);
    closeLoginModal();
    localStorage.setItem('lumiere_user', userName);
    var isDeliveryMode = !new URLSearchParams(window.location.search).get('table');
    if (isDeliveryMode && !localStorage.getItem('lumiere_delivery_address')) {
        setTimeout(function() { openDeliveryModal(); }, 350);
    }
}
function handleRegister() {
    var nameEl = document.querySelector('#registerForm input[type="text"]');
    var userName = (nameEl && nameEl.value.trim()) ? nameEl.value.trim() : 'User';
    updateProfileUI(userName);
    closeLoginModal();
    localStorage.setItem('lumiere_user', userName);
    var isDeliveryMode = !new URLSearchParams(window.location.search).get('table');
    if (isDeliveryMode && !localStorage.getItem('lumiere_delivery_address')) {
        setTimeout(function() { openDeliveryModal(); }, 350);
    }
}
function doLogout() {
    localStorage.removeItem('lumiere_user'); updateProfileUI(null);
    document.querySelectorAll('.profile-dropdown').forEach(function(d) { d.classList.remove('open'); });
}
function updateProfileUI(name) {
    var isIn = !!name;
    ['profileName', 'profileName2'].forEach(function(id) {
        var e = document.getElementById(id); if (e) e.textContent = name || 'Guest';
    });
    ['guestLinks', 'guestLinks2'].forEach(function(id) {
        var e = document.getElementById(id); if (e) e.style.display = isIn ? 'none' : 'flex';
    });
    ['userLinks', 'userLinks2'].forEach(function(id) {
        var e = document.getElementById(id); if (e) e.style.display = isIn ? 'flex' : 'none';
    });
}

/* =============================================
   DELIVERY MODAL
============================================= */
function openDeliveryModal() {
    document.querySelectorAll('.profile-dropdown').forEach(function(d) { d.classList.remove('open'); });

    var isDeliveryMode = !new URLSearchParams(window.location.search).get('table');
    if (isDeliveryMode && !localStorage.getItem('lumiere_user')) {
        openLoginModal('login');
        setTimeout(function() {
            var hint = document.querySelector('.login-hint');
            if (hint) {
                hint.textContent = 'Please sign in to set your delivery address.';
                hint.style.color = '#c8a96a';
            }
        }, 100);
        return;
    }

    document.getElementById('deliveryModal').classList.add('open');
    document.getElementById('deliveryModalOverlay').classList.add('open');
    document.getElementById('gpsStatus').textContent = '';
    document.getElementById('gpsStatus').style.color = '#888';
}

function closeDeliveryModal() {
    document.getElementById('deliveryModal').classList.remove('open');
    document.getElementById('deliveryModalOverlay').classList.remove('open');
}

function getGPSLocation() {
    var status = document.getElementById('gpsStatus');
    var btn = document.getElementById('gpsBtn');

    if (!navigator.geolocation) {
        status.textContent = '⚠️ Geolocation not supported by your browser.';
        status.style.color = '#ef4444';
        return;
    }

    btn.disabled = true;
    btn.style.opacity = '0.6';
    status.style.color = '#c8a96a';
    status.textContent = '📡 Detecting your location...';

    navigator.geolocation.getCurrentPosition(
        function(pos) {
            var lat = pos.coords.latitude.toFixed(5);
            var lng = pos.coords.longitude.toFixed(5);
            fetch('https://nominatim.openstreetmap.org/reverse?lat=' + lat + '&lon=' + lng + '&format=json')
            .then(function(r) { return r.json(); })
            .then(function(data) {
                var addr = data.address || {};
                document.getElementById('deliveryFlat').value = addr.house_number || addr.building || '';
                document.getElementById('deliveryArea').value =
                    (addr.road || addr.neighbourhood || addr.suburb || '') +
                    (addr.quarter ? ', ' + addr.quarter : '');
                document.getElementById('deliveryCity').value =
                    addr.city || addr.town || addr.village || addr.county || '';
                document.getElementById('deliveryPin').value = addr.postcode || '';
                status.style.color = '#4ade80';
                status.textContent = '✅ Location detected successfully!';
                btn.disabled = false;
                btn.style.opacity = '1';
            })
            .catch(function() {
                document.getElementById('deliveryArea').value = 'Lat: ' + lat + ', Lng: ' + lng;
                status.style.color = '#4ade80';
                status.textContent = '✅ Location captured (coordinates).';
                btn.disabled = false;
                btn.style.opacity = '1';
            });
        },
        function(err) {
            btn.disabled = false;
            btn.style.opacity = '1';
            status.style.color = '#ef4444';
            if (err.code === 1)      status.textContent = '🚫 Permission denied. Please allow location access.';
            else if (err.code === 2) status.textContent = '⚠️ Location unavailable. Please enter manually.';
            else                     status.textContent = '⏱️ Timed out. Please try again.';
        },
        { timeout: 10000, enableHighAccuracy: true }
    );
}

function saveDeliveryAddress(type) {
    var flat   = document.getElementById('deliveryFlat').value.trim();
    var area   = document.getElementById('deliveryArea').value.trim();
    var city   = document.getElementById('deliveryCity').value.trim();
    var pin    = document.getElementById('deliveryPin').value.trim();
    var status = document.getElementById('gpsStatus');

    if (!area && !city) {
        status.textContent = '⚠️ Please detect or enter your address first.';
        status.style.color = '#ef4444';
        return;
    }

    var fullAddress = [flat, area, city, pin].filter(Boolean).join(', ');

    localStorage.setItem('lumiere_delivery_address', JSON.stringify({
        type: type, address: fullAddress,
        flat: flat, area: area, city: city, pin: pin
    }));
    window.orderMode = 'delivery';

    var icons = { home: '🏠', work: '💼', other: '📍' };
    var label = (icons[type] || '📍') + ' ' + (city || 'Delivery') + ' ▾';
    document.querySelectorAll('.deliver-value').forEach(function(el) { el.textContent = label; });

    var summaryH3 = document.querySelector('.summary h3');
    if (summaryH3) summaryH3.innerHTML = '🛵 Delivery Order';

    var placeBtn = document.querySelector('.place');
    if (placeBtn) placeBtn.textContent = 'Place Delivery Order';

    var billBtn = document.getElementById('requestBillBtn');
    if (billBtn) billBtn.style.display = 'none';

    closeDeliveryModal();
    showDeliveryConfirm(type, fullAddress);
}

function showDeliveryConfirm(type, address) {
    var icons = { home: '🏠', work: '💼', other: '📍' };
    var existing = document.getElementById('deliveryConfirmOverlay');
    if (existing) existing.remove();

    var overlay = document.createElement('div');
    overlay.id = 'deliveryConfirmOverlay';
    overlay.style.cssText =
        'position:fixed;inset:0;background:rgba(0,0,0,0.88);z-index:99999;' +
        'display:flex;align-items:center;justify-content:center;' +
        'animation:overlayFadeIn .25s ease;';

    overlay.innerHTML =
        '<div style="background:#111;border:1px solid #c8a96a;border-radius:18px;' +
        'padding:36px 30px;text-align:center;max-width:340px;width:88%;' +
        'animation:cardPopIn .35s cubic-bezier(.34,1.56,.64,1);">' +
        '<div style="font-size:50px;margin-bottom:12px">' + (icons[type] || '📍') + '</div>' +
        '<h2 style="color:#c8a96a;font-family:\'Cormorant Garamond\',serif;font-size:24px;margin:0 0 10px;font-weight:600;">Address Saved!</h2>' +
        '<p style="color:#aaa;font-size:13px;margin:0 0 20px;line-height:1.7;">' + address + '</p>' +
        '<button onclick="document.getElementById(\'deliveryConfirmOverlay\').remove()" ' +
        'style="background:#c8a96a;color:#000;border:none;padding:11px 36px;border-radius:8px;' +
        'font-size:14px;font-weight:700;cursor:pointer;letter-spacing:.5px;">Done</button>' +
        '</div>';

    document.body.appendChild(overlay);
}

/* =============================================
   DINE IN CONFIRM
============================================= */
function openDineInConfirm() {
    document.querySelectorAll('.profile-dropdown').forEach(function(d) { d.classList.remove('open'); });
    var table = getTableFromURL();

    var existing = document.getElementById('dineInOverlay');
    if (existing) existing.remove();

    var overlay = document.createElement('div');
    overlay.id = 'dineInOverlay';
    overlay.style.cssText =
        'position:fixed;inset:0;background:rgba(0,0,0,0.88);z-index:99999;' +
        'display:flex;align-items:center;justify-content:center;' +
        'animation:overlayFadeIn .25s ease;';

    overlay.innerHTML =
        '<div style="background:#111;border:1px solid #c8a96a;border-radius:18px;' +
        'padding:40px 32px;text-align:center;max-width:340px;width:88%;' +
        'animation:cardPopIn .35s cubic-bezier(.34,1.56,.64,1);">' +
        '<div style="font-size:52px;margin-bottom:14px;">🪑</div>' +
        '<h2 style="color:#c8a96a;font-family:\'Cormorant Garamond\',serif;font-size:26px;margin:0 0 8px;font-weight:600;">Dine In</h2>' +
        (table
            ? '<p style="color:#aaa;font-size:13px;margin:0 0 4px;">You\'re ordering for</p>' +
              '<p style="color:#fff;font-size:22px;font-family:\'Cormorant Garamond\',serif;font-weight:600;margin:0 0 14px;">Table ' + table + '</p>'
            : '<p style="color:#ef4444;font-size:13px;margin:0 0 14px;">⚠️ No table found. Please scan your table\'s QR code.</p>'
        ) +
        '<div style="border-top:1px solid #222;border-bottom:1px solid #222;margin:0 0 22px;padding:12px 0;">' +
        '<p style="color:#aaa;font-size:13px;margin:0;line-height:1.8;">' +
        'Browse the menu, add items to your cart,<br>then tap <b style="color:#c8a96a">Place Order</b> —<br>food will be served at your table. 🍽️</p>' +
        '</div>' +
        '<button onclick="document.getElementById(\'dineInOverlay\').remove()" ' +
        'style="background:#c8a96a;color:#000;border:none;padding:12px 40px;border-radius:8px;' +
        'font-size:14px;font-weight:700;cursor:pointer;letter-spacing:.5px;">Got it!</button>' +
        '</div>';

    document.body.appendChild(overlay);
}

function setOrderMode(mode) {
    if (mode === 'delivery') openDeliveryModal();
    else openDineInConfirm();
}

/* =============================================
   VEG TOGGLE
============================================= */
function toggleVeg(checked) {
    document.querySelectorAll('.item').forEach(function(item) {
        if (checked && item.getAttribute('data-type') !== 'veg') item.style.display = 'none';
        else item.style.display = 'block';
    });
    updateSubheadings();
}

/* =============================================
   SCROLL — show summary only after hero
============================================= */
function handleScroll() {
    var hero = document.querySelector('.hero');
    if (!hero) return;
    var heroH = hero.offsetHeight;
    var summary = document.querySelector('.summary');
    var cartBar = document.querySelector('.cart-bar');
    var floatBtn = document.getElementById('floatMenuBtn');

    if (window.scrollY >= heroH - 10) {
        if (window.innerWidth > 900) {
            if (summary) summary.style.display = 'block';
            if (cartBar) cartBar.style.display = 'none';
        } else {
            if (cartBar) cartBar.style.display = 'flex';
            if (summary && !summary.classList.contains('active')) {
                summary.style.display = 'none';
            }
        }
        if (floatBtn) floatBtn.style.display = 'flex';
    } else {
        if (summary) {
            summary.classList.remove('active');
            summary.style.display = 'none';
        }
        if (cartBar) cartBar.style.display = 'none';
        if (floatBtn) { floatBtn.style.display = 'none'; floatBtn.classList.remove('open'); }
    }
}
window.addEventListener('scroll', handleScroll);
window.addEventListener('resize', function() { handleScroll(); tsInit(); });

/* =============================================
   TODAY'S SPECIAL AUTO-SLIDER
============================================= */
var tsIndex = 0;
var tsAutoTimer = null;
var tsAutoInterval = 3000;
var TS_CARD_W = 240;

function tsInit() {
    var track = document.getElementById('tsCardsTrack');
    if (!track) return;
    var cards = track.querySelectorAll('.ts-card');
    if (cards.length === 0) return;
    var dotsEl = document.getElementById('tsDots');
    var availW = window.innerWidth > 900 ? window.innerWidth - 260 - 80 : window.innerWidth - 80;
    var visibleCount = Math.max(1, Math.floor(availW / TS_CARD_W));
    var totalDots = Math.max(1, cards.length - visibleCount + 1);
    dotsEl.innerHTML = '';
    for (var i = 0; i < totalDots; i++) {
        var d = document.createElement('button');
        d.className = 'ts-dot' + (i === 0 ? ' active' : '');
        (function(idx) {
            d.onclick = function() { tsGoTo(idx); tsAutoStop(); tsAutoStart(); };
        })(i);
        dotsEl.appendChild(d);
    }
    tsGoTo(0);
    tsAutoStart();
}

function tsGoTo(idx) {
    var track = document.getElementById('tsCardsTrack');
    if (!track) return;
    var cards = track.querySelectorAll('.ts-card');
    var availW = window.innerWidth > 900 ? window.innerWidth - 260 - 80 : window.innerWidth - 80;
    var visibleCount = Math.max(1, Math.floor(availW / TS_CARD_W));
    var maxIdx = Math.max(0, cards.length - visibleCount);
    idx = Math.max(0, Math.min(idx, maxIdx));
    tsIndex = idx;
    track.style.transform = 'translateX(-' + (idx * TS_CARD_W) + 'px)';
    document.querySelectorAll('.ts-dot').forEach(function(d, i) {
        d.classList.toggle('active', i === idx);
    });
    var prev = document.getElementById('tsPrev');
    var next = document.getElementById('tsNext');
    if (prev) prev.disabled = idx === 0;
    if (next) next.disabled = idx >= maxIdx;
    tsProgressReset();
}

function tsSlide(dir) {
    var track = document.getElementById('tsCardsTrack');
    if (!track) return;
    var cards = track.querySelectorAll('.ts-card');
    var availW = window.innerWidth > 900 ? window.innerWidth - 260 - 80 : window.innerWidth - 80;
    var visibleCount = Math.max(1, Math.floor(availW / TS_CARD_W));
    var maxIdx = Math.max(0, cards.length - visibleCount);
    var next = tsIndex + dir;
    if (next < 0) next = maxIdx;
    if (next > maxIdx) next = 0;
    tsGoTo(next);
    tsAutoStop();
    tsAutoStart();
}

function tsProgressReset() {
    var fill = document.getElementById('tsProgressFill');
    if (!fill) return;
    fill.style.transition = 'none';
    fill.style.width = '0%';
    setTimeout(function() {
        fill.style.transition = 'width ' + tsAutoInterval + 'ms linear';
        fill.style.width = '100%';
    }, 30);
}
function tsAutoStart() {
    tsAutoStop();
    tsProgressReset();
    tsAutoTimer = setInterval(function() { tsSlide(1); }, tsAutoInterval);
}
function tsAutoStop() {
    if (tsAutoTimer) { clearInterval(tsAutoTimer); tsAutoTimer = null; }
    var fill = document.getElementById('tsProgressFill');
    if (fill) { fill.style.transition = 'none'; fill.style.width = '0%'; }
}

/* =============================================
   INIT
============================================= */
window.onload = function() {
    var summary = document.querySelector('.summary');
    var cartBar = document.querySelector('.cart-bar');
    var floatBtn = document.getElementById('floatMenuBtn');
    if (summary) summary.style.display = 'none';
    if (cartBar) cartBar.style.display = 'none';
    if (floatBtn) floatBtn.style.display = 'none';

    setTableDisplay();

    var saved = localStorage.getItem('lumiere_user');
    if (saved) updateProfileUI(saved);

    var tableParam = new URLSearchParams(window.location.search).get('table');

    if (tableParam) {
        window.orderMode = 'dinein';
        var summaryH3 = document.querySelector('.summary h3');
        if (summaryH3) summaryH3.innerHTML = '🪑 Table ' + tableParam + ' — Order Summary';
        var placeBtn = document.querySelector('.place');
        if (placeBtn) placeBtn.textContent = 'Place Order';
        var billBtn = document.getElementById('requestBillBtn');
        if (billBtn) { billBtn.style.display = ''; billBtn.style.removeProperty('display'); }
    } else {
        window.orderMode = 'delivery';
        var summaryH3d = document.querySelector('.summary h3');
        if (summaryH3d) summaryH3d.innerHTML = '🛵 Delivery Order';
        var placeBtnD = document.querySelector('.place');
        if (placeBtnD) placeBtnD.textContent = 'Place Delivery Order';
        var billBtnD = document.getElementById('requestBillBtn');
        if (billBtnD) billBtnD.style.display = 'none';

        var savedRaw = localStorage.getItem('lumiere_delivery_address');
        if (!savedRaw) {
            setTimeout(function() { openDeliveryModal(); }, 1200);
        }
    }

    var savedAddr = localStorage.getItem('lumiere_delivery_address');
    if (savedAddr) {
        try {
            var parsed = JSON.parse(savedAddr);
            var icons = { home: '🏠', work: '💼', other: '📍' };
            var city = parsed.address ? parsed.address.split(',')[2] || '' : '';
            var label = (icons[parsed.type] || '📍') + ' ' + city.trim() + ' ▾';
            document.querySelectorAll('.deliver-value').forEach(function(el) { el.textContent = label; });
        } catch(e) {}
    }

    document.querySelectorAll('.controls button').forEach(function(btn) {
        btn.addEventListener('click', function(e) { e.stopPropagation(); });
    });

    tsInit();
};