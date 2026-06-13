let posts = [];
let currentAvatarData = "🦊"; 
let loadedMediaBase64 = ""; 
let activeChatUser = null;
let currentViewedUser = null; 

// Cuentas de la Red Social (Ahora esperando usuarios reales)
const MOCK_USERS = {};

document.addEventListener("DOMContentLoaded", () => {
    loadProfile();
    initSystemData();
    loadPosts();
    renderStoriesUI();
    renderChatChannels();
    updateProfileStats(); 
    renderProfileFeed();  
    document.getElementById('search-input').addEventListener('input', handleSearch);
    
    // Captura de archivos multimedia
    document.getElementById('pulse-file-media').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if(file) {
            const reader = new FileReader();
            reader.onload = function(evt) {
                loadedMediaBase64 = evt.target.result;
                document.getElementById('media-file-status').textContent = `📁 Archivo Cargado (${file.type.split('/')[0]})`;
            };
            reader.readAsDataURL(file);
        }
    });
});

function initSystemData() {

    
}


// DETECTAR EVENTOS DE PERFIL
document.getElementById('profile-name').addEventListener('input', () => {
    saveProfileData();
    updateProfileStats();
    renderProfileFeed(); 
});
document.getElementById('profile-avatar-select').addEventListener('change', function() {
    saveProfileData(this.value);
});
document.getElementById('profile-photo-upload').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) { saveProfileData(e.target.result); };
        reader.readAsDataURL(file);
    }
});

function saveProfileData(newAvatarData = null) {
    const name = document.getElementById('profile-name').value.trim() || "Usuario Plus";
    if (newAvatarData) currentAvatarData = newAvatarData;
    const profile = { name, avatar: currentAvatarData };
    localStorage.setItem('plus_profile', JSON.stringify(profile));
    updateAvatarUI(currentAvatarData);
}

function updateAvatarUI(avatarData) {
    const isImage = avatarData.startsWith('data:image') || avatarData.startsWith('http');
    const contentHTML = isImage ? `<img src="${avatarData}" class="avatar-img">` : avatarData;
    document.getElementById('story-my-avatar').innerHTML = contentHTML;
    document.getElementById('nav-profile-icon').innerHTML = contentHTML;
    
    const bigAvatar = document.getElementById('profile-big-avatar');
    if(bigAvatar && !currentViewedUser) bigAvatar.innerHTML = contentHTML;
}

function loadProfile() {
    const savedProfile = localStorage.getItem('plus_profile');
    if (savedProfile) {
        const profile = JSON.parse(savedProfile);
        document.getElementById('profile-name').value = profile.name;
        currentAvatarData = profile.avatar;
        updateAvatarUI(currentAvatarData);
        if(!currentAvatarData.startsWith('data:image')) {
            const selectEl = document.getElementById('profile-avatar-select');
            if(selectEl) selectEl.value = currentAvatarData;
        }
    }
}

function switchTab(tabName, buttonElement) {
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(tab => tab.classList.remove('active'));
    if(buttonElement) buttonElement.classList.add('active');

    const views = document.querySelectorAll('.app-view');
    views.forEach(view => view.classList.remove('active-view'));
    
    document.getElementById(`view-${tabName}`).classList.add('active-view');
    
    if (tabName === 'feed') window.scrollTo({ top: 0, behavior: 'smooth' });
    if (tabName === 'profile') {
        if (buttonElement !== null) currentViewedUser = null;
        updateProfileStats();
        renderProfileFeed(); 
    }
}

function openUserProfile(username) {
    const myName = (document.getElementById('profile-name').value || "Usuario Plus").trim();
    if (username.toLowerCase() === myName.toLowerCase()) {
        currentViewedUser = null; 
    } else {
        currentViewedUser = username; 
    }
    switchTab('profile', null);
}

// NAVEGACIÓN Y ESTADÍSTICAS REALES
function updateProfileStats() {
    const myName = (document.getElementById('profile-name').value || "Usuario Plus").trim();
    const targetUser = currentViewedUser || myName;
    
    // Contar publicaciones
    const userPostsCount = posts.filter(post => post.name.toLowerCase() === targetUser.toLowerCase()).length;
    const postsStat = document.getElementById('stat-posts-count');
    if (postsStat) postsStat.textContent = userPostsCount;
    
    const followingStat = document.getElementById('stat-following-count');
    const followersStat = document.getElementById('stat-followers-count');

    // CONVERTIR LOS NÚMEROS EN BOTONES CLICKEABLES
    [followersStat, followingStat].forEach(stat => {
        if(stat && stat.parentElement) {
            stat.parentElement.style.cursor = 'pointer';
            stat.parentElement.title = "Ver lista de usuarios";
            // Efecto sutil visual para indicar que es interactivo
            stat.parentElement.onmouseenter = () => stat.parentElement.style.opacity = '0.7';
            stat.parentElement.onmouseleave = () => stat.parentElement.style.opacity = '1';
        }
    });

    if(followersStat && followersStat.parentElement) followersStat.parentElement.onclick = () => openConnectionsModal('followers');
    if(followingStat && followingStat.parentElement) followingStat.parentElement.onclick = () => openConnectionsModal('following');

    if (currentViewedUser) {
        // Estadísticas de perfil ajeno (Simuladas en formato texto)
        if (followingStat) followingStat.textContent = "120";
        const mockInfo = MOCK_USERS[currentViewedUser];
        if (followersStat) followersStat.textContent = mockInfo ? mockInfo.followers : "0";
    } else {
        // Mis propias estadísticas (Cantidades Reales Exactas)
        const following = JSON.parse(localStorage.getItem('plus_following') || "[]");
        const followers = JSON.parse(localStorage.getItem('plus_followers') || "[]");
        
        if (followingStat) followingStat.textContent = following.length;
        if (followersStat) followersStat.textContent = followers.length;
    }
    
    // CONTROL DE INTERFAZ
    const nameInput = document.getElementById('profile-name');
    const avatarSelect = document.getElementById('profile-avatar-select');
    let dynamicHeader = document.getElementById('profile-dynamic-view-header');
    
    if (!dynamicHeader && nameInput) {
        dynamicHeader = document.createElement('div');
        dynamicHeader.id = 'profile-dynamic-view-header';
        nameInput.parentNode.insertBefore(dynamicHeader, nameInput);
    }
    
    if (nameInput) {
        if (currentViewedUser) {
            nameInput.style.display = 'none';
            if (avatarSelect) avatarSelect.style.display = 'none';
            
            let siblings = nameInput.parentNode.children;
            for (let el of siblings) {
                if (el.id !== 'profile-dynamic-view-header' && el.id !== 'profile-big-avatar' && el.id !== 'profile-posts-feed' && !el.contains(nameInput) && !el.innerText?.includes('Pulses') && !el.innerText?.includes('Seguidores')) {
                    if (el.tagName !== 'STYLE' && !el.classList.contains('profile-grid')) {
                        el.style.display = 'none';
                    }
                }
            }
            
            const mockInfo = MOCK_USERS[currentViewedUser];
            const isVerified = mockInfo?.verified || false;
            const followingList = JSON.parse(localStorage.getItem('plus_following') || "[]");
            const isSiguiendo = followingList.includes(currentViewedUser);
            
            dynamicHeader.innerHTML = `
                <div style="text-align: center; margin-top: 15px; padding: 12px; background: #1e293b; border-radius: 8px; border: 1px solid #334155;">
                    <h2 style="color: white; font-size: 20px; margin: 0 0 5px 0; display: flex; align-items: center; justify-content: center; gap: 5px;">
                        ${currentViewedUser} ${isVerified ? "<i class='bx bxs-badge-check' style='color:#38bdf8;'></i>":""}
                    </h2>
                    <button class="follow-btn ${isSiguiendo ? 'following' : ''}" style="width: 100%; padding: 10px; margin-top: 10px; border-radius: 6px; font-weight: bold; cursor: pointer;" onclick="toggleFollowFromProfile('${currentViewedUser}', this)">
                        ${isSiguiendo ? 'Siguiendo' : 'Seguir'}
                    </button>
                </div>
                <h3 style="color: #a855f7; font-size: 14px; margin: 20px 0 10px 0; text-transform: uppercase;">
                    📝 Publicaciones de ${currentViewedUser}
                </h3>
            `;
            dynamicHeader.style.display = 'block';
            
            const targetAvatar = mockInfo ? mockInfo.avatar : "👤";
            const isImg = targetAvatar.startsWith('data:image') || targetAvatar.startsWith('http');
            document.getElementById('profile-big-avatar').innerHTML = isImg ? `<img src="${targetAvatar}" class="avatar-img">` : targetAvatar;
            
        } else {
            nameInput.style.display = 'block';
            if (avatarSelect) avatarSelect.style.display = 'block';
            
            let siblings = nameInput.parentNode.children;
            for (let el of siblings) {
                if (el.id !== 'profile-dynamic-view-header' && el.id !== 'post-detail-modal' && el.id !== 'connections-modal') {
                    el.style.display = '';
                }
            }
            if (dynamicHeader) dynamicHeader.style.display = 'none';
            
            updateAvatarUI(currentAvatarData);
        }
    }
}

// ==========================================
// VENTANA FLOTANTE DE SEGUIDORES / SIGUIENDO
// ==========================================
function openConnectionsModal(type) {
    let modal = document.getElementById('connections-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'connections-modal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(15, 23, 42, 0.95); display: flex; align-items: center;
            justify-content: center; z-index: 10000; padding: 20px; backdrop-filter: blur(8px);
        `;
        document.body.appendChild(modal);
    }

    const myName = (document.getElementById('profile-name').value || "Usuario Plus").trim();
    const targetUser = currentViewedUser || myName;
    
    let usersList = [];
    if (targetUser === myName) {
        // Tus listas reales y exactas
        usersList = type === 'followers' 
            ? JSON.parse(localStorage.getItem('plus_followers') || "[]")
            : JSON.parse(localStorage.getItem('plus_following') || "[]");
    } else {
        // Listas simuladas si miras el perfil de otro
        if (type === 'followers') {
            usersList = ["Pixel", "Cris", "Shadow"].filter(u => u !== targetUser);
            if (JSON.parse(localStorage.getItem('plus_following') || "[]").includes(targetUser)) usersList.push(myName);
        } else {
            usersList = ["Astron", "Pixel"].filter(u => u !== targetUser);
        }
    }

    let listHTML = "";
    if (usersList.length === 0) {
        listHTML = `<p style="text-align:center; color:#64748b; margin-top:20px; font-size:14px;">Aún no hay usuarios aquí.</p>`;
    } else {
        usersList.forEach(username => {
            let avatar = "👤";
            let isVerified = false;
            
            if (username === myName) {
                avatar = currentAvatarData;
            } else if (MOCK_USERS[username]) {
                avatar = MOCK_USERS[username].avatar;
                isVerified = MOCK_USERS[username].verified;
            }

            const isAvatarImg = avatar.startsWith('data:image') || avatar.startsWith('http');
            const avatarHTML = isAvatarImg ? `<img src="${avatar}" class="avatar-img" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">` : `<div style="font-size:24px; text-align:center; line-height:40px;">${avatar}</div>`;
            const badge = isVerified ? `<i class='bx bxs-badge-check' style='color:#38bdf8;'></i>` : "";

            listHTML += `
                <div style="display:flex; align-items:center; gap:15px; padding:12px; border-bottom:1px solid #334155; cursor:pointer; transition: background 0.3s;" 
                     onmouseenter="this.style.background='#1e293b'" onmouseleave="this.style.background='transparent'"
                     onclick="closeConnectionsModal(); openUserProfile('${username}')">
                    <div style="width:45px; height:45px; background:#1e293b; border-radius:50%; border:2px solid #38bdf8; display:flex; align-items:center; justify-content:center; overflow:hidden;">
                        ${avatarHTML}
                    </div>
                    <div style="color:white; font-weight:bold; font-size:16px;">
                        ${username} ${badge}
                    </div>
                    <i class='bx bx-chevron-right' style="color:#64748b; margin-left:auto; font-size:24px;"></i>
                </div>
            `;
        });
    }

    const title = type === 'followers' ? '👥 Seguidores' : '✨ Siguiendo';

    modal.innerHTML = `
        <div style="position: relative; width: 100%; max-width: 400px; background:#0f172a; border-radius:16px; border:1px solid #334155; max-height:75vh; display:flex; flex-direction:column; box-shadow: 0 10px 25px rgba(0,0,0,0.8);">
            <div style="padding:18px 20px; border-bottom:1px solid #334155; display:flex; justify-content:space-between; align-items:center; background:#1e293b; border-radius:16px 16px 0 0;">
                <h3 style="color:white; margin:0; font-size:18px;">${title}</h3>
                <button onclick="closeConnectionsModal()" style="background:none; border:none; color:#94a3b8; font-size:28px; cursor:pointer;"><i class='bx bx-x'></i></button>
            </div>
            <div style="padding:5px; overflow-y:auto; flex:1;">
                ${listHTML}
            </div>
        </div>
    `;
    modal.style.display = 'flex';
}

function closeConnectionsModal() {
    const modal = document.getElementById('connections-modal');
    if (modal) modal.style.display = 'none';
}

function toggleFollowFromProfile(username, btn) {
    toggleFollow(username, btn);
    updateProfileStats();
}

function renderProfileFeed() {
    const myName = (document.getElementById('profile-name').value || "Usuario Plus").trim().toLowerCase();
    const targetUser = currentViewedUser ? currentViewedUser.toLowerCase() : myName;
    
    const myPosts = posts.filter(post => post.name.toLowerCase() === targetUser);
    const container = document.getElementById('profile-posts-feed');
    if (!container) return;
    container.innerHTML = ""; 

    if (myPosts.length === 0) {
        container.innerHTML = `<p class="placeholder-text" style="text-align:center; padding: 20px; color:#64748b; font-size:14px;">No hay publicaciones aún.</p>`;
        return;
    }

    const grid = document.createElement('div');
    grid.classList.add('profile-grid');

    myPosts.forEach(post => {
        const item = document.createElement('div');
        item.classList.add('profile-grid-item');

        let innerContent = "";
        let topIcon = "";

        if (post.image) {
            const isVideo = post.image.match(/\.(mp4|webm|ogg)$/i) || post.image.startsWith('data:video');
            if (isVideo) {
                innerContent = `<video src="${post.image}" class="profile-grid-img"></video>`;
                topIcon = `<i class='bx bx-play-circle grid-top-icon'></i>`;
            } else {
                innerContent = `<img src="${post.image}" class="profile-grid-img">`;
            }
        } else {
            innerContent = `<div class="profile-grid-text">${post.text.substring(0, 60)}...</div>`;
            topIcon = `<i class='bx bx-text grid-top-icon'></i>`;
        }

        const deleteBtnHTML = !currentViewedUser ? `
            <button class="grid-delete-btn" onclick="event.stopPropagation(); deletePulse(${post.id})">
                <i class='bx bx-trash'></i>
            </button>
        ` : '';

        item.innerHTML = `
            <div style="width:100%; height:100%; cursor:pointer;" onclick="openFullPostModal(${post.id})">
                ${innerContent}
                ${topIcon}
            </div>
            ${deleteBtnHTML}
        `;
        grid.appendChild(item);
    });

    container.appendChild(grid);
}

function openFullPostModal(postId) {
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    let modal = document.getElementById('post-detail-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'post-detail-modal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(15, 23, 42, 0.95); display: flex; align-items: center;
            justify-content: center; z-index: 9999; padding: 20px; backdrop-filter: blur(8px);
        `;
        document.body.appendChild(modal);
    }

    let mediaHTML = "";
    if (post.image) {
        const isVideo = post.image.match(/\.(mp4|webm|ogg)$/i) || post.image.startsWith('data:video');
        if (isVideo) {
            mediaHTML = `<video src="${post.image}" class="post-video" controls autoplay style="max-height:45vh; width:100%; object-fit:contain; border-radius:8px;"></video>`;
        } else {
            mediaHTML = `<img src="${post.image}" class="post-image" style="max-height:50vh; width:100%; object-fit:contain; border-radius:8px;">`;
        }
    }

    const isAvatarImg = post.avatar && (post.avatar.startsWith('data:image') || post.avatar.startsWith('http'));
    const avatarHTML = isAvatarImg ? `<img src="${post.avatar}" class="avatar-img">` : post.avatar;
    const isVerified = MOCK_USERS[post.name]?.verified || post.name === "Mundo Deportes" || post.name === "AstroNews";
    const verifiedBadge = isVerified ? `<i class='bx bxs-badge-check' style='color: #38bdf8; font-size:14px;'></i>` : '';

    modal.innerHTML = `
        <div style="position: relative; width: 100%; max-width: 480px; background:#0f172a; border-radius:12px;">
            <button onclick="closeFullPostModal()" style="position: absolute; top: -45px; right: 0; background: none; border: none; color: #94a3b8; font-size: 32px; cursor: pointer;"><i class='bx bx-x'></i></button>
            
            <div class="pulse-card ${post.vibe}" style="margin:0; border:1px solid #334155;">
                <div class="card-header">
                    <div class="card-user-info" style="cursor:pointer;" onclick="closeFullPostModal(); openUserProfile('${post.name}')">
                        <span class="post-avatar">${avatarHTML}</span>
                        <div>
                            <span class="username">${post.name} ${verifiedBadge}</span>
                            <span class="badge">${post.vibeText}</span>
                        </div>
                    </div>
                    <span class="time">${post.time}</span>
                </div>
                <p class="card-text" style="white-space: pre-wrap;">${post.text}</p>
                ${mediaHTML}
                <div class="card-footer">
                    <button class="reaction-btn ${post.userReactedFire ? 'active' : ''}" onclick="toggleReactionInModal(${post.id}, 'fire')">🔥 <span class="count">${post.reactions.fire}</span></button>
                    <button class="reaction-btn ${post.userReactedHeart ? 'active' : ''}" onclick="toggleReactionInModal(${post.id}, 'heart')">💜 <span class="count">${post.reactions.heart}</span></button>
                </div>
            </div>
        </div>
    `;
    modal.style.display = 'flex';
}

function closeFullPostModal() {
    const modal = document.getElementById('post-detail-modal');
    if (modal) modal.style.display = 'none';
}

function toggleReactionInModal(postId, type) {
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    if (type === 'fire') {
        if (post.userReactedFire) { post.reactions.fire--; post.userReactedFire = false; }
        else { post.reactions.fire++; post.userReactedFire = true; }
    } else if (type === 'heart') {
        if (post.userReactedHeart) { post.reactions.heart--; post.userReactedHeart = false; }
        else { post.reactions.heart++; post.userReactedHeart = true; }
    }
    localStorage.setItem('plus_posts', JSON.stringify(posts));
    renderFeed(posts, 'pulse-feed');
    renderProfileFeed(); 
    openFullPostModal(postId); 
}

function toggleFollow(username, btn) {
    let following = JSON.parse(localStorage.getItem('plus_following') || "[]");
    if(following.includes(username)){
        following = following.filter(u => u !== username);
        btn.textContent = "Seguir";
        btn.classList.remove('following');
    } else {
        following.push(username);
        btn.textContent = "Siguiendo";
        btn.classList.add('following');
    }
    localStorage.setItem('plus_following', JSON.stringify(following));
    updateProfileStats();
    
    // Si estás viendo la lista de "Siguiendo" abierta, repíntala para actualizar en vivo
    if (document.getElementById('connections-modal') && document.getElementById('connections-modal').style.display === 'flex') {
        // En este caso simple, no forzamos repintado para no cerrar y abrir el modal feo.
    }
}
// MOTOR DEL FEED
function loadPosts() {
    // Si Firebase está conectado, leemos de la nube
    if (window.db && window.cloud) {
        try {
            const q = window.cloud.query(window.cloud.collection(window.db, "posts"), window.cloud.orderBy("timestamp", "desc"));
            window.cloud.onSnapshot(q, (snapshot) => {
                posts = [];
                snapshot.forEach((doc) => {
                    posts.push({ id: doc.id, ...doc.data() });
                });
                renderFeed(posts, 'pulse-feed');
            });
            return; 
        } catch (e) {
            console.log("Usando modo local.");
        }
    }

    // MODO LOCAL
    const savedPosts = localStorage.getItem('plus_posts');
    if (savedPosts) {
        posts = JSON.parse(savedPosts);
    } else {
        posts = [
            {
                id: 3, name: "Mundo Deportes", avatar: "⚽", vibe: "vibe-moment", vibeText: "📸 Momento", time: "Hace 5m",
                text: "¡Arrancó oficialmente el torneo! El ambiente es una locura absoluta en el estadio. #WorldCup2026",
                image: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=500",
                reactions: { fire: 124, heart: 98 }
            }
        ];
        localStorage.setItem('plus_posts', JSON.stringify(posts));
    }
    renderFeed(posts, 'pulse-feed');
}

function renderFeed(postsArray, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = ""; 

    if (postsArray.length === 0) {
        container.innerHTML = `<p class="placeholder-text" style="text-align:center; padding: 20px; color:#64748b; font-size:14px;">No hay publicaciones aquí todavía.</p>`;
        return;
    }

    const following = JSON.parse(localStorage.getItem('plus_following') || "[]");
    const currentName = document.getElementById('profile-name').value.trim().toLowerCase();

    postsArray.forEach(post => {
        const card = document.createElement('div');
        card.classList.add('pulse-card', post.vibe);

        let mediaHTML = "";
        if (post.image) {
            const isVideo = post.image.match(/\.(mp4|webm|ogg)$/i) || post.image.startsWith('data:video');
            if (isVideo) {
                mediaHTML = `<video src="${post.image}" class="post-video" controls></video>`;
            } else {
                mediaHTML = `<img src="${post.image}" class="post-image" onerror="this.style.display='none'">`;
            }
        }

        const isAvatarImg = post.avatar && (post.avatar.startsWith('data:image') || post.avatar.startsWith('http'));
        const avatarHTML = isAvatarImg ? `<img src="${post.avatar}" class="avatar-img">` : post.avatar;

        const isVerified = MOCK_USERS[post.name]?.verified || post.name === "Mundo Deportes" || post.name === "AstroNews";
        const verifiedBadge = isVerified ? `<i class='bx bxs-badge-check' style='color: #38bdf8; font-size:14px;'></i>` : '';

        let followBtnHTML = "";
        if(post.name.toLowerCase() !== currentName && MOCK_USERS[post.name]) {
            const isSiguiendo = following.includes(post.name);
// Cambiamos 'post.name' por 'post.userId' (o como se llame el campo del ID en tus datos)
// También cambiamos la función a 'followUser'
followBtnHTML = `<button class="follow-btn" data-userid="${post.userId}" onclick="followUser(this)">${isSiguiendo ? 'Siguiendo' : 'Seguir'}</button>`;
        }

        card.innerHTML = `
            <div class="card-header">
                <div class="card-user-info" style="cursor:pointer;" onclick="openUserProfile('${post.name}')">
                    <span class="post-avatar">${avatarHTML}</span>
                    <div>
                        <span class="username">${post.name} ${verifiedBadge}</span>
                        <span class="badge">${post.vibeText}</span>
                    </div>
                </div>
                ${followBtnHTML}
                <span class="time">${post.time}</span>
            </div>
            <p class="card-text">${post.text}</p>
            ${mediaHTML}
            <div class="card-footer">
                <button class="reaction-btn ${post.userReactedFire ? 'active' : ''}" onclick="toggleReaction(${post.id}, 'fire', '${containerId}')">🔥 <span class="count">${post.reactions.fire}</span></button>
                <button class="reaction-btn ${post.userReactedHeart ? 'active' : ''}" onclick="toggleReaction(${post.id}, 'heart', '${containerId}')">💜 <span class="count">${post.reactions.heart}</span></button>
                ${post.name.toLowerCase() === currentName ? `<button class="icon-btn" style="margin-left:auto; color:#ef4444; font-size:18px;" onclick="event.stopPropagation(); deletePulse(${post.id})"><i class='bx bx-trash'></i></button>` : ''}
            </div>
        `;
        container.appendChild(card);
    });
}

function deletePulse(id) {
    posts = posts.filter(p => p.id !== id);
    localStorage.setItem('plus_posts', JSON.stringify(posts));
    renderFeed(posts, 'pulse-feed');
    renderProfileFeed(); 
    updateProfileStats();
}

// LANZAR PUBLICACIÓN 
document.getElementById('btn-pulse-publish').addEventListener('click', async function() {
    const text = document.getElementById('pulse-input').value.trim();
    let image = document.getElementById('pulse-image').value.trim();
    if(typeof loadedMediaBase64 !== 'undefined' && loadedMediaBase64) image = loadedMediaBase64;

    if (text === "" && image === "") {
        alert("¡No puedes lanzar un pulso vacío!");
        return;
    }

    const vibeSelect = document.getElementById('pulse-vibe');
    const currentName = document.getElementById('profile-name').value.trim() || "Usuario Plus";

    const newPost = {
        name: currentName, 
        avatar: typeof currentAvatarData !== 'undefined' ? currentAvatarData : "🦊",
        vibe: vibeSelect.value, 
        vibeText: vibeSelect.options[vibeSelect.selectedIndex].text,
        time: "Ahora mismo", 
        text: text, 
        image: image,
        reactions: { fire: 0, heart: 0 },
        timestamp: Date.now()
    };

    // INTENTAR GUARDAR EN FIREBASE
    if (window.db && window.cloud) {
        try {
            await window.cloud.addDoc(window.cloud.collection(window.db, "posts"), newPost);
            limpiarFormulario();
            return; 
        } catch (e) {
            console.log("Guardando localmente.");
        }
    }

    // RESPALDO LOCAL
    newPost.id = Date.now();
    posts.unshift(newPost);
    localStorage.setItem('plus_posts', JSON.stringify(posts));
    
    limpiarFormulario();
    renderFeed(posts, 'pulse-feed');
    if(typeof updateProfileStats === 'function') updateProfileStats();
    if(typeof renderProfileFeed === 'function') renderProfileFeed();
    switchTab('feed', null); 
});

// GESTIÓN DE HISTORIAS DE USUARIOS
function triggerStoryUpload() {
    document.getElementById('story-file-upload').click();
}
document.getElementById('story-file-upload').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if(file) {
        const reader = new FileReader();
        reader.onload = function(evt) {
            const stories = JSON.parse(localStorage.getItem('plus_stories') || "[]");
            const currentName = document.getElementById('profile-name').value.trim() || "Usuario Plus";
            stories.unshift({ name: currentName, avatar: currentAvatarData, media: evt.target.result });
            localStorage.setItem('plus_stories', JSON.stringify(stories));
            renderStoriesUI();
            alert("¡Historia subida con éxito a tu pulso!");
        };
        reader.readAsDataURL(file);
    }
});

function renderStoriesUI() {
    const container = document.getElementById('friends-stories');
    if(!container) return;
    container.innerHTML = "";
    const stories = JSON.parse(localStorage.getItem('plus_stories') || "[]");
    
    stories.forEach((st, index) => {
        const item = document.createElement('div');
        item.classList.add('story-item');
        item.onclick = () => openStoryViewer(index);
        const isImg = st.avatar.startsWith('data:image') || st.avatar.startsWith('http');
        const avHTML = isImg ? `<img src="${st.avatar}" class="avatar-img">` : st.avatar;
        
        item.innerHTML = `<div class="story-circle ring-neon">${avHTML}</div><span>${st.name}</span>`;
        container.appendChild(item);
    });
}

let storyTimer = null;
function openStoryViewer(index) {
    const stories = JSON.parse(localStorage.getItem('plus_stories') || "[]");
    const story = stories[index];
    if(!story) return;

    document.getElementById('story-modal-username').textContent = story.name;
    document.getElementById('story-modal-avatar').innerHTML = story.avatar.startsWith('data:image') ? `<img src="${story.avatar}" class="avatar-img">` : story.avatar;
    document.getElementById('story-modal-content').innerHTML = `<img src="${story.media}" class="story-image-full">`;
    
    document.getElementById('story-modal').style.display = 'flex';
    const progress = document.getElementById('story-progress');
    progress.style.width = '0%';
    setTimeout(() => progress.style.width = '100%', 50);

    storyTimer = setTimeout(() => closeStory(), 4050);
}
function closeStory() {
    clearTimeout(storyTimer);
    document.getElementById('story-modal').style.display = 'none';
}

// BANDEJA DE ENTRADA Y CHAT EN VIVO ENCRIPTADO
function renderChatChannels() {
    const list = document.getElementById('chat-channels-list');
    if(!list) return;
    list.innerHTML = "";
    
    Object.keys(MOCK_USERS).forEach(user => {
        const row = document.createElement('div');
        row.classList.add('chat-channel-row');
        row.onclick = () => openChatWith(user);
        
        row.innerHTML = `
            <div class="post-avatar">${MOCK_USERS[user].avatar}</div>
            <div>
                <strong>${user} ${MOCK_USERS[user].verified ? "<i class='bx bxs-badge-check' style='color:#38bdf8;'></i>":""}</strong>
                <p style="font-size:12px; color:#64748b;">Pulsa para abrir chat encriptado...</p>
            </div>
        `;
        list.appendChild(row);
    });
}

function openChatWith(username) {
    activeChatUser = username;
    document.getElementById('chat-channels-list').style.display = 'none';
    document.getElementById('active-chat-box').style.display = 'block';
    document.getElementById('chat-target-name').textContent = username;
    document.getElementById('chat-target-avatar').textContent = MOCK_USERS[username].avatar;
    renderMessages();
}

function closeActiveChat() {
    document.getElementById('chat-channels-list').style.display = 'block';
    document.getElementById('active-chat-box').style.display = 'none';
    activeChatUser = null;
}

function renderMessages() {
    const area = document.getElementById('chat-messages-display');
    area.innerHTML = "";
    if(!activeChatUser) return;
    
    const chats = JSON.parse(localStorage.getItem('plus_chats') || "{}");
    const userMsgs = chats[activeChatUser] || [];
    
    userMsgs.forEach(m => {
        const bub = document.createElement('div');
        bub.classList.add('msg-bubble', m.sender === "me" ? 'sent' : 'received');
        bub.textContent = m.text;
        area.appendChild(bub);
    });
    area.scrollTop = area.scrollHeight;
}

function sendDirectMessage() {
    const inp = document.getElementById('chat-msg-input');
    const txt = inp.value.trim();
    if(!txt || !activeChatUser) return;
    
    const chats = JSON.parse(localStorage.getItem('plus_chats') || "{}");
    if(!chats[activeChatUser]) chats[activeChatUser] = [];
    
    chats[activeChatUser].push({ sender: "me", text: txt });
    localStorage.setItem('plus_chats', JSON.stringify(chats));
    inp.value = "";
    renderMessages();
    
    setTimeout(() => {
        chats[activeChatUser].push({ sender: activeChatUser, text: "Recibido encriptado en nodo central de Plus. 🔥" });
        localStorage.setItem('plus_chats', JSON.stringify(chats));
        renderMessages();
    }, 1500);
}

let callTimeout = null;
function startCall(isVideo) {
    if(!activeChatUser) return;
    document.getElementById('call-screen-name').textContent = activeChatUser;
    document.getElementById('call-screen-avatar').textContent = MOCK_USERS[activeChatUser].avatar;
    document.getElementById('call-status').textContent = isVideo ? "Iniciando Videollamada..." : "Llamando por canal seguro...";
    document.getElementById('btn-accept-call').style.display = 'none';
    document.getElementById('call-overlay').style.display = 'flex';
    
    callTimeout = setTimeout(() => {
        document.getElementById('call-status').textContent = "Conectado // Audio HD";
    }, 2500);
}

function endCall() {
    clearTimeout(callTimeout);
    document.getElementById('call-overlay').style.display = 'none';
}

function clearSystemCache() {
    if(confirm("¿Estás seguro de reiniciar la App Plus? Se borrarán tus publicaciones locales.")) {
        localStorage.clear();
        window.location.reload();
    }
}

// BÚSQUEDA INTEGRADA
function handleSearch() {
    const query = document.getElementById('search-input').value.toLowerCase().trim();
    const resultsContainer = document.getElementById('search-results');
    if (query === "") {
        resultsContainer.innerHTML = `<p class="placeholder-text">Empieza a escribir para filtrar publicaciones o usuarios...</p>`;
        return;
    }
    const filtered = posts.filter(post => post.name.toLowerCase().includes(query) || post.text.toLowerCase().includes(query));
    renderFeed(filtered, 'search-results');
}

function filterByHashtag(hashtag) {
    switchTab('trends');
    const filtered = posts.filter(post => post.text.toLowerCase().includes(hashtag.toLowerCase()));
    const targetContainer = document.getElementById('trends-filtered-feed');
    targetContainer.innerHTML = `<h4 style="font-size:13px; color:#38bdf8; margin: 15px 0 10px 0; text-transform:uppercase;">Pulses relacionados:</h4>`;
    const innerFeedDiv = document.createElement('div');
    innerFeedDiv.id = "inner-trend-feed";
    targetContainer.appendChild(innerFeedDiv);
    renderFeed(filtered, 'inner-trend-feed');
}

function toggleReaction(postId, type, currentContainerId) {
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    if (type === 'fire') {
        if (post.userReactedFire) { post.reactions.fire--; post.userReactedFire = false; }
        else { post.reactions.fire++; post.userReactedFire = true; }
    } else if (type === 'heart') {
        if (post.userReactedHeart) { post.reactions.heart--; post.userReactedHeart = false; }
        else { post.reactions.heart++; post.userReactedHeart = true; }
    }
    localStorage.setItem('plus_posts', JSON.stringify(posts));
    renderFeed(posts, 'pulse-feed');
    renderProfileFeed(); 
    if (currentContainerId === 'search-results') handleSearch();
}
function limpiarFormulario() {
  // Usamos 'pulse-input' porque es el ID que tiene tu textarea en el HTML
  const input = document.getElementById('pulse-input');
  if (input) {
    input.value = "";
  }
}
async function followUser(botonPresionado) {
    const targetUserId = botonPresionado.getAttribute("data-userid");
    const { doc, updateDoc, arrayUnion, increment, getDoc, setDoc } = window.cloud;
    const auth = getAuth();

    if (!auth.currentUser) return alert("Inicia sesión primero");

    const myRef = doc(window.db, "users", auth.currentUser.uid);
    const targetRef = doc(window.db, "users", targetUserId);

    // 1. Intentamos actualizar el contador
    try {
        await updateDoc(targetRef, { followersCount: increment(1) });
    } catch (e) {
        // 2. Si el contador no existe, lo creamos empezando en 1
        await setDoc(targetRef, { followersCount: 1 }, { merge: true });
    }

    // 3. Guardamos quién sigue a quién
    await updateDoc(myRef, { following: arrayUnion(targetUserId) });
   
    alert("¡Seguimiento exitoso!");
}