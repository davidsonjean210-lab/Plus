import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, where, doc, updateDoc, arrayUnion, arrayRemove, increment, getDoc, setDoc, serverTimestamp, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyDVRkOh1x2QSmn_SuuNlYEF51FNNj1oapk",
    authDomain: "plus-7bb95.firebaseapp.com",
    projectId: "plus-7bb95",
    storageBucket: "plus-7bb95.firebasestorage.app",
    messagingSenderId: "794281987667",
    appId: "1:794281987667:web:4416005ed2b652893ec0a6"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

let currentUser = null; 
let datosMiPerfilGlobal = null;
let usuariosGlobales = [];
let cacheTodosLosPosts = [];
let desubscribirPosts = null, desubscribirUsuarios = null, desubscribirNotif = null, desubscribirChatMensajes = null, desubscribirStories = null;

let chatUserUidActivo = null;
let temporizadorHistoria = null;
let perfilAjenoUidActivo = null;

function formatearFecha(timestamp) {
    if (!timestamp) return "Ahora mismo";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const ahora = new Date();
    const difSegundos = Math.floor((ahora - date) / 1000);
    if (difSegundos < 60) return "Ahora mismo";
    const difMinutos = Math.floor(difSegundos / 60);
    if (difMinutos < 60) return `Hace ${difMinutos} min`;
    const difHoras = Math.floor(difMinutos / 60);
    if (difHoras < 24) return `Hace ${difHoras} h`;
    return date.toLocaleDateString();
}

function mostrarMuro() { document.getElementById('auth-screen').classList.add('hidden'); document.getElementById('main-screen').classList.remove('hidden'); navegarA('inicio'); }
function mostrarLogin() {
    document.getElementById('auth-screen').classList.remove('hidden'); document.getElementById('main-screen').classList.add('hidden');
    if(desubscribirPosts) desubscribirPosts(); if(desubscribirUsuarios) desubscribirUsuarios();
    if(desubscribirNotif) desubscribirNotif(); if(desubscribirStories) desubscribirStories();
    cerrarChatActivo(); terminarVisorHistoria();
}

function navegarA(tab) {
    const tabs = ['inicio', 'buscar', 'publicar', 'explorar', 'perfil', 'notificaciones', 'mensajes', 'perfil-ajeno'];
    tabs.forEach(t => { document.getElementById(`tab-${t}`)?.classList.add('hidden'); document.getElementById(`btn-tab-${t}`)?.classList.remove('active'); });
    document.getElementById(`tab-${tab}`).classList.remove('hidden');
    document.getElementById(`btn-tab-${tab}`)?.classList.add('active');
    
    if(tab === 'notificaciones') { localStorage.setItem('lastCheckedNotif', Date.now().toString()); document.getElementById('badge-notif').classList.add('hidden'); }
    if(tab === 'mensajes') { cerrarChatActivo(); localStorage.setItem('lastCheckedMensajes', Date.now().toString()); document.getElementById('badge-mensajes').classList.add('hidden'); }
    if(tab !== 'perfil-ajeno') perfilAjenoUidActivo = null;
}

async function subirImagenPerfil(file, tipo) {
    if(!currentUser) return;
    const btnId = tipo === 'perfil' ? 'btn-cambiar-foto' : 'btn-cambiar-portada';
    const btn = document.getElementById(btnId);
    const originalText = btn.innerText; btn.innerText = "⏳ Subiendo...";
    try {
        const storageRef = ref(storage, (tipo === 'perfil' ? 'perfiles/' : 'portadas/') + currentUser.uid + '_' + Date.now());
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        await updateDoc(doc(db, "users", currentUser.uid), tipo === 'perfil' ? { profilePic: url } : { coverPic: url });
        btn.innerText = "✅ Listo!"; setTimeout(() => { btn.innerText = originalText; }, 2500);
    } catch(e) { console.error(e); alert("Error."); btn.innerText = originalText; }
}

function dibujarPosts(listaDePosts, contenedorId = 'feed-container') {
    const contenedor = document.getElementById(contenedorId);
    if (!contenedor) return;
    if (listaDePosts.length === 0) { contenedor.innerHTML = '<p style="color:var(--texto-gris); text-align:center;">No hay publicaciones.</p>'; return; }
    let html = "";
    listaDePosts.forEach(post => {
        const likes = post.likes || []; const comments = post.comments || [];
        const yaDioLike = currentUser && likes.includes(currentUser.uid);
        const btnEliminar = (currentUser && post.uid === currentUser.uid) ? `<button style="background:none; border:none; color:#ff4a5a; cursor:pointer;" onclick="ejecutarEliminar('${post.id}')">🗑️</button>` : '';

        let comentariosHtml = "";
        if(comments.length > 0) {
            comentariosHtml = `<div class="comment-section">`;
            comments.forEach((c) => { 
                const encodedComment = encodeURIComponent(JSON.stringify(c));
                const puedeBorrarC = (currentUser && (post.uid === currentUser.uid || c.username === datosMiPerfilGlobal?.username));
                const btnBorrarC = puedeBorrarC ? `<button style="background:none; border:none; color:#ff4a5a; font-size:11px; cursor:pointer; padding:0; margin-left:10px;" onclick="ejecutarEliminarComentario('${post.id}', '${encodedComment}')">Borrar</button>` : '';
                comentariosHtml += `<div style="margin-bottom: 5px; display:flex; justify-content:space-between;"><span><b>@${c.username}:</b> <span style="color: var(--texto-gris);">${c.text}</span></span> ${btnBorrarC}</div>`; 
            });
            comentariosHtml += `</div>`;
        }

        const imagenHtml = post.imageUrl ? `<img src="${post.imageUrl}" class="post-img">` : '';
        const esRepulse = post.isRepulse ? `<div style="font-size: 11px; color: var(--texto-gris); margin-bottom: 8px; font-weight: bold;">🔁 Re-pulsado de @${post.originalAuthor}</div>` : '';

        html += `
            <div class="custom-card">
                ${esRepulse}
                <div class="card-top">
                    <span style="color: var(--texto-blanco); cursor:pointer;" onclick="verPerfilDe('${post.uid}')">@${post.username || "anonimo"} <span style="color:var(--texto-gris); font-size:11px; font-weight:normal; margin-left:5px;">• ${formatearFecha(post.timestamp)}</span></span>
                    ${btnEliminar}
                </div>
                <p class="card-main-text" style="font-weight:normal; font-size:15px; margin-top:8px;">${post.text}</p>
                ${imagenHtml}
                <div class="action-bar">
                    <button class="action-btn ${yaDioLike ? 'liked' : ''}" onclick="ejecutarLike('${post.id}', '${post.uid}')">❤️ ${likes.length}</button>
                    <button class="action-btn" onclick="ejecutarComentar('${post.id}')">💬 ${comments.length}</button>
                    <button class="action-btn" onclick="ejecutarRepulse('${post.id}')" title="Compartir">🔁</button>
                </div>
                ${comentariosHtml}
            </div>`;
    });
    contenedor.innerHTML = html;
}

function generarHtmlUsuario(user) {
    const yaLoSigo = datosMiPerfilGlobal?.following?.includes(user.uid);
    return `<div class="custom-card" style="display:flex; justify-content:space-between; align-items:center;">
            <div style="cursor:pointer;" onclick="verPerfilDe('${user.uid}')">
                <span style="font-weight:bold; color:var(--texto-blanco);">@${user.username}</span><br>
                <small style="color:var(--texto-gris);">${user.bio || 'Nuevo en plus.'}</small>
            </div>
            <button class="btn-follow-action ${yaLoSigo ? 'following' : ''}" onclick="ejecutarSeguir('${user.uid}')">${yaLoSigo ? 'Siguiendo' : 'Seguir'}</button>
        </div>`;
}

function verSeguidores(targetUid) { const seguidores = usuariosGlobales.filter(u => u.following && u.following.includes(targetUid)); document.getElementById('modal-lista-titulo').innerText = 'Seguidores'; document.getElementById('modal-lista-contenido').innerHTML = seguidores.length ? seguidores.map(generarHtmlUsuario).join('') : "<p style='text-align:center;'>Sin seguidores.</p>"; document.getElementById('modal-lista-usuarios').classList.remove('hidden'); }
function verSiguiendo(targetUid) { const t = usuariosGlobales.find(u => u.uid === targetUid) || (targetUid === currentUser.uid ? datosMiPerfilGlobal : null); const list = t?.following || []; const seguidos = usuariosGlobales.filter(u => list.includes(u.uid)); document.getElementById('modal-lista-titulo').innerText = 'Siguiendo'; document.getElementById('modal-lista-contenido').innerHTML = seguidos.length ? seguidos.map(generarHtmlUsuario).join('') : "<p style='text-align:center;'>No sigue a nadie.</p>"; document.getElementById('modal-lista-usuarios').classList.remove('hidden'); }
function cerrarModalListaUI() { document.getElementById('modal-lista-usuarios').classList.add('hidden'); }

function actualizarMurosYFeed() {
    if (!datosMiPerfilGlobal || cacheTodosLosPosts.length === 0) { dibujarPosts([], 'feed-container'); return; }
    const misSiguiendo = datosMiPerfilGlobal.following || [];
    dibujarPosts(cacheTodosLosPosts.filter(p => p.uid === currentUser.uid || misSiguiendo.includes(p.uid)), 'feed-container');
    dibujarTendencias(); if (perfilAjenoUidActivo) actualizarVistaPerfilAjeno();
}

function dibujarUsuarios() {
    const otros = usuariosGlobales.filter(u => u.uid !== currentUser.uid);
    document.getElementById('users-container').innerHTML = otros.length ? otros.map(generarHtmlUsuario).join('') : '<p>Sin recomendaciones.</p>';
    dibujarListaContactosChat(otros);
}

function dibujarTendencias() {
    const pops = [...cacheTodosLosPosts].sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0)).slice(0, 3);
    document.getElementById('trending-container').innerHTML = pops.length ? pops.map((post, i) => `<div class="custom-card" onclick="verPerfilDe('${post.uid}')"><div class="card-top"><span>#${i + 1} Tendencia</span></div><p style="margin:5px 0;">${post.text}</p></div>`).join('') : "<p>No hay tendencias.</p>";
}

function dibujarListaContactosChat(lista) { 
    document.getElementById('chat-users-list').innerHTML = lista.map(u => {
        const avatarHtml = u.profilePic ? `<img src="${u.profilePic}" style="width:100%; height:100%; object-fit:cover;">` : `👤`;
        return `
        <div class="chat-list-item" onclick="entrarAlChat('${u.uid}', '${u.username}')">
            <div class="chat-list-avatar">${avatarHtml}</div>
            <div class="chat-list-info">
                <p class="chat-list-name">${u.username}</p>
                <p class="chat-list-preview">Toca para abrir el chat...</p>
            </div>
        </div>`;
    }).join(''); 
}

function renderHeaderPerfil(user, isMe) {
    const avatarHtml = user.profilePic ? `<img src="${user.profilePic}">` : `<svg viewBox="0 0 24 24" width="40" height="40" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="7" r="4"></circle><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path></svg>`;
    const bannerHtml = user.coverPic ? `<img src="${user.coverPic}" class="cover-photo">` : `<div class="cover-photo"></div>`;
    const btnSeguirHtml = !isMe ? `<button class="btn-plus ${datosMiPerfilGlobal?.following?.includes(user.uid) ? 'btn-plus-sec' : ''}" style="width:auto; padding:8px 24px; border-radius:20px; margin-top:10px;" onclick="ejecutarSeguir('${user.uid}')">${datosMiPerfilGlobal?.following?.includes(user.uid) ? 'Dejar de seguir' : 'Seguir'}</button>` : '';

    return `
        <div class="profile-card-header">
            ${bannerHtml}
            <div class="avatar-circle overlap">${avatarHtml}</div>
            <div class="profile-info">
                <h2 style="margin:5px 0; font-size:24px;">@${user.username}</h2>
                <p style="color:var(--texto-blanco); font-size:15px;">${user.bio || 'Sin biografía'}</p>
                ${btnSeguirHtml}
            </div>
        </div>
        <div class="stats-row">
            <div class="stat-box" onclick="mostrarSeguidores('${user.uid}')"><span>${user.followersCount || 0}</span><label>Seguidores</label></div>
            <div class="stat-box" onclick="mostrarSiguiendo('${user.uid}')"><span>${user.following?.length || 0}</span><label>Siguiendo</label></div>
        </div>
    `;
}

function dibujarMiPerfil() { if(datosMiPerfilGlobal) document.getElementById('profile-container').innerHTML = renderHeaderPerfil(datosMiPerfilGlobal, true); }
function actualizarVistaPerfilAjeno() {
    if(!perfilAjenoUidActivo) return; const u = usuariosGlobales.find(x => x.uid === perfilAjenoUidActivo);
    if(u) { document.getElementById('user-profile-container').innerHTML = renderHeaderPerfil(u, false); dibujarPosts(cacheTodosLosPosts.filter(p => p.uid === u.uid), 'user-feed-container'); }
}
function verPerfilUsuario(uid) { if(currentUser && uid === currentUser.uid) navegarA('perfil'); else { perfilAjenoUidActivo = uid; navegarA('perfil-ajeno'); actualizarVistaPerfilAjeno(); } }

function dibujarNotificaciones(lista) {
    document.getElementById('notifications-container').innerHTML = lista.length ? lista.sort((a, b) => (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0)).map(n => {
        let icono = '👾'; let accion = 'te sigue';
        if(n.type === 'like') { icono = '🚀'; accion = 'le gustó tu pulso'; }
        if(n.type === 'repulse') { icono = '🔁'; accion = 're-pulsó tu publicación'; }
        if(n.type === 'message') { icono = '💬'; accion = 'te ha enviado un mensaje'; }
        return `<div class="notif-item">
            <p class="notif-text">${icono} ${n.fromUsername} ${accion}</p>
            <p class="notif-time">${formatearFecha(n.timestamp)}</p>
        </div>`;
    }).join('') : '<p style="text-align:center; padding: 20px; color: var(--texto-gris);">Sin actividad reciente.</p>';
}

function dibujarHistoriasBarra(lista) {
    let html = `<div><div class="story-circle create" onclick="solicitarCrearHistoria()">＋</div><div class="story-username">Tú</div></div>`;
    const limite = Date.now() - 86400000; const vistos = [];
    lista.filter(s => (s.timestamp?.toMillis() || Date.now()) > limite).forEach(s => { if(!vistos.includes(s.uid)) { vistos.push(s.uid); html += `<div><div class="story-circle" onclick="lanzarVisorHistoria('${s.text.replace(/'/g, "\\'")}', '${s.username}')"><span style="font-size:20px;">👤</span></div><div class="story-username" onclick="verPerfilDe('${s.uid}')">@${s.username}</div></div>`; } });
    document.getElementById('stories-carousel-container').innerHTML = html;
}

async function crearNuevaHistoria(texto) { try { await addDoc(collection(db, "stories"), { text: texto, uid: currentUser.uid, username: datosMiPerfilGlobal.username, timestamp: serverTimestamp() }); } catch(e) {} }
function reproducirHistoria(t, u) { terminarVisorHistoria(); document.getElementById('story-viewer-username').innerText = `@${u}`; document.getElementById('story-viewer-content').innerText = t; const v = document.getElementById('story-viewer'); const b = document.getElementById('story-progress-bar'); v.classList.remove('hidden'); b.style.width = '0%'; setTimeout(() => { b.style.transition = 'width 4s linear'; b.style.width = '100%'; }, 50); temporizadorHistoria = setTimeout(terminarVisorHistoria, 4050); }
function terminarVisorHistoria() { clearTimeout(temporizadorHistoria); const b = document.getElementById('story-progress-bar'); if(b) { b.style.transition = 'none'; b.style.width = '0%'; } document.getElementById('story-viewer')?.classList.add('hidden'); }

async function abrirChatCon(tUid, tUser) {
    chatUserUidActivo = tUid; 
    document.getElementById('chat-target-username').innerText = `${tUser}`; 
    const targetUserObj = usuariosGlobales.find(u => u.uid === tUid);
    document.getElementById('chat-active-avatar').innerHTML = (targetUserObj && targetUserObj.profilePic) ? `<img src="${targetUserObj.profilePic}" style="width:100%; height:100%; object-fit:cover;">` : `👤`;

    document.getElementById('chat-list-view').classList.add('hidden'); 
    document.getElementById('chat-active-view').classList.remove('hidden');
    
    const chatId = [currentUser.uid, tUid].sort().join("_");
    if(desubscribirChatMensajes) desubscribirChatMensajes();
    const box = document.getElementById('chat-messages-container'); box.innerHTML = "Cargando...";
    
    desubscribirChatMensajes = onSnapshot(query(collection(db, "direct_messages"), where("chatId", "==", chatId), orderBy("timestamp", "asc")), (snap) => {
        let h = ""; snap.forEach(d => { 
            const m = d.data(); const mId = d.id;
            const imgHtml = m.imageUrl ? `<img src="${m.imageUrl}">` : '';
            const txtHtml = m.text ? `<span>${m.text}</span>` : '';
            const btnBorrar = m.senderUid === currentUser.uid ? `<div style="font-size:10px; text-align:right; cursor:pointer; opacity:0.6; margin-top:4px;" onclick="ejecutarBorrarMensaje('${mId}')">Borrar</div>` : '';
            h += `<div class="chat-bubble ${m.senderUid === currentUser.uid ? 'enviado' : 'recibido'}">${imgHtml}${txtHtml}${btnBorrar}</div>`; 
        });
        box.innerHTML = h || "<p style='text-align:center; color:var(--texto-gris); margin-top:20px;'>Di hola 👋</p>"; 
        setTimeout(() => { box.scrollTop = box.scrollHeight; }, 100);
    });
}

function cerrarChatActivo() { chatUserUidActivo = null; if(desubscribirChatMensajes) desubscribirChatMensajes(); document.getElementById('chat-list-view').classList.remove('hidden'); document.getElementById('chat-active-view').classList.add('hidden'); }

async function enviarMensajePrivado(txt, imgUrl = null) { 
    if(chatUserUidActivo) {
        await addDoc(collection(db, "direct_messages"), { chatId: [currentUser.uid, chatUserUidActivo].sort().join("_"), senderUid: currentUser.uid, text: txt, imageUrl: imgUrl, timestamp: serverTimestamp() }); 
        await addDoc(collection(db, "notifications"), { toUid: chatUserUidActivo, fromUsername: datosMiPerfilGlobal.username, type: 'message', timestamp: serverTimestamp() });
    } 
}

async function enviarFotoEnChat(file) {
    if(!chatUserUidActivo || !currentUser) return;
    const inputPill = document.getElementById('chat-input-text');
    const oldPill = inputPill.placeholder;
    inputPill.placeholder = "Enviando foto...";
    try {
        const storageRef = ref(storage, 'chat_images/' + currentUser.uid + '_' + Date.now());
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        await enviarMensajePrivado("", url);
    } catch(e) { alert("Error al subir foto"); }
    inputPill.placeholder = oldPill;
    document.getElementById('chat-input-foto').value = "";
}

async function borrarMensajeChat(mId) { if(confirm("¿Borrar mensaje para todos?")) await deleteDoc(doc(db, "direct_messages", mId)); }

function buscarUsuarios() {
    const q = document.getElementById('input-busqueda').value.toLowerCase(); const c = document.getElementById('resultados-busqueda');
    if(!q) { c.innerHTML = "Busca amigos..."; return; }
    const r = usuariosGlobales.filter(u => u.username.toLowerCase().includes(q) && u.uid !== currentUser.uid);
    c.innerHTML = r.length ? r.map(generarHtmlUsuario).join('') : "<p>No encontrados.</p>";
}

async function darLike(pId, oUid) { const r = doc(db, "posts", pId); const s = await getDoc(r); const d = s.data(); if(d.likes?.includes(currentUser.uid)) { await updateDoc(r, { likes: arrayRemove(currentUser.uid) }); } else { await updateDoc(r, { likes: arrayUnion(currentUser.uid) }); if(oUid !== currentUser.uid) await addDoc(collection(db, "notifications"), { toUid: oUid, fromUsername: datosMiPerfilGlobal.username, type: 'like', timestamp: serverTimestamp() }); } }
async function comentarPost(pId) { const t = prompt("Tu respuesta:"); if(t?.trim()) await updateDoc(doc(db, "posts", pId), { comments: arrayUnion({ username: datosMiPerfilGlobal.username, text: t.trim() }) }); }
async function borrarComentario(postId, commentStr) { if(confirm("¿Borrar este comentario?")) { const cObj = JSON.parse(decodeURIComponent(commentStr)); await updateDoc(doc(db, "posts", postId), { comments: arrayRemove(cObj) }); } }
async function editarPerfil() { const b = prompt("Nueva biografía:"); if(b) await updateDoc(doc(db, "users", currentUser.uid), { bio: b.substring(0, 100) }); }
async function eliminarPost(pId) { if(confirm("¿Eliminar publicación?")) await deleteDoc(doc(db, "posts", pId)); }

async function hacerRepulse(pId) {
    const postOriginal = cacheTodosLosPosts.find(p => p.id === pId);
    if (!postOriginal || !datosMiPerfilGlobal) return;
    if (confirm("¿Quieres compartir (Re-pulsar) esta publicación en tu perfil?")) {
        try {
            await addDoc(collection(db, "posts"), { text: postOriginal.text, imageUrl: postOriginal.imageUrl || null, uid: currentUser.uid, username: datosMiPerfilGlobal.username, likes: [], comments: [], timestamp: serverTimestamp(), isRepulse: true, originalAuthor: postOriginal.username, originalUid: postOriginal.uid, originalPostId: postOriginal.id });
            if(postOriginal.uid !== currentUser.uid) await addDoc(collection(db, "notifications"), { toUid: postOriginal.uid, fromUsername: datosMiPerfilGlobal.username, type: 'repulse', timestamp: serverTimestamp() });
            alert("¡Publicación compartida con éxito!");
        } catch(e) { console.error(e); alert("Error al hacer re-pulse."); }
    }
}

async function crearPublicacion(texto) {
    if (!datosMiPerfilGlobal) return;
    const btn = document.getElementById('btn-publicar-accion'); btn.innerText = "Publicando...";
    const fileInput = document.getElementById('input-post-foto');
    const file = fileInput.files[0]; let imgUrl = null;
    try {
        if(file) { const storageRef = ref(storage, 'posts_images/' + currentUser.uid + '_' + Date.now()); await uploadBytes(storageRef, file); imgUrl = await getDownloadURL(storageRef); }
        await addDoc(collection(db, "posts"), { text: texto, uid: currentUser.uid, username: datosMiPerfilGlobal.username, imageUrl: imgUrl, likes: [], comments: [], timestamp: serverTimestamp() });
        document.getElementById('post-text').value = ""; fileInput.value = ""; document.getElementById('preview-post-img').style.display = 'none'; navegarA('inicio');
    } catch(e) { alert("Error al publicar"); } btn.innerText = "Publicar ahora";
}

async function toggleSeguirUsuario(uid) {
    if(!datosMiPerfilGlobal) return; const mR = doc(db, "users", currentUser.uid); const oR = doc(db, "users", uid);
    if(datosMiPerfilGlobal.following?.includes(uid)) { await updateDoc(mR, { following: arrayRemove(uid) }); await updateDoc(oR, { followersCount: increment(-1) }); } else { await updateDoc(mR, { following: arrayUnion(uid) }); await updateDoc(oR, { followersCount: increment(1) }); await addDoc(collection(db, "notifications"), { toUid: uid, fromUsername: datosMiPerfilGlobal.username, type: 'follow', timestamp: serverTimestamp() }); }
}

onAuthStateChanged(auth, (user) => { if(user) { currentUser = user; mostrarMuro(); activarLecturaTiempoReal(); } else { currentUser = null; mostrarLogin(); } });

async function registrarUsuario(e, p, u) { try { const c = await createUserWithEmailAndPassword(auth, e, p); await setDoc(doc(db, "users", c.user.uid), { uid: c.user.uid, username: u.replace(/\s+/g, '').toLowerCase(), followersCount: 0, following: [], bio: "¡Hola! Acabo de unirme a plus." }); alert("Creada!"); } catch(e) { alert(e.message); } }
async function iniciarSesion(e, p) { try { await signInWithEmailAndPassword(auth, e, p); } catch(e) { alert("Error."); } }
async function cerrarSesion() { await signOut(auth); }

function activarLecturaTiempoReal() {
    desubscribirPosts = onSnapshot(query(collection(db, "posts"), orderBy("timestamp", "desc")), (s) => { cacheTodosLosPosts = s.docs.map(d => ({ id: d.id, ...d.data() })); actualizarMurosYFeed(); });
    desubscribirUsuarios = onSnapshot(collection(db, "users"), async (s) => { usuariosGlobales = s.docs.map(d => d.data()); const mD = await getDoc(doc(db, "users", currentUser.uid)); if(mD.exists()) datosMiPerfilGlobal = mD.data(); else { datosMiPerfilGlobal = { uid: currentUser.uid, username: currentUser.email.split('@')[0], followersCount: 0, following: [], bio: "Hola!" }; await setDoc(doc(db, "users", currentUser.uid), datosMiPerfilGlobal); } dibujarUsuarios(); dibujarMiPerfil(); buscarUsuarios(); actualizarMurosYFeed(); });
    
    desubscribirNotif = onSnapshot(query(collection(db, "notifications"), where("toUid", "==", currentUser.uid)), (s) => {
        const lista = s.docs.map(d => d.data()); dibujarNotificaciones(lista);
        const lastCheckedNotif = parseInt(localStorage.getItem('lastCheckedNotif') || "0"); const lastCheckedMensajes = parseInt(localStorage.getItem('lastCheckedMensajes') || "0");
        const nuevasNotif = lista.filter(n => n.type !== 'message' && n.timestamp && n.timestamp.toMillis() > lastCheckedNotif).length;
        const badgeNotif = document.getElementById('badge-notif'); if(nuevasNotif > 0 && document.getElementById('tab-notificaciones').classList.contains('hidden')) { badgeNotif.innerText = nuevasNotif; badgeNotif.classList.remove('hidden'); } else badgeNotif.classList.add('hidden');
        const nuevosMensajes = lista.filter(n => n.type === 'message' && n.timestamp && n.timestamp.toMillis() > lastCheckedMensajes).length;
        const badgeMensajes = document.getElementById('badge-mensajes'); if(nuevosMensajes > 0 && document.getElementById('tab-mensajes').classList.contains('hidden') && !chatUserUidActivo) { badgeMensajes.innerText = nuevosMensajes; badgeMensajes.classList.remove('hidden'); } else badgeMensajes.classList.add('hidden');
    });
    
    desubscribirStories = onSnapshot(query(collection(db, "stories"), orderBy("timestamp", "desc")), (s) => dibujarHistoriasBarra(s.docs.map(d => d.data())));
}

window.registrarUsuario = registrarUsuario; window.iniciarSesion = iniciarSesion; window.cerrarSesion = cerrarSesion; window.crearPublicacion = crearPublicacion; window.toggleSeguirUsuario = toggleSeguirUsuario; window.navegarA = navegarA; window.buscarUsuarios = buscarUsuarios; window.darLike = darLike; window.comentarPost = comentarPost; window.editarPerfil = editarPerfil; window.eliminarPost = eliminarPost; window.abrirChatCon = abrirChatCon; window.cerrarChatActivo = cerrarChatActivo; window.enviarMensajePrivado = enviarMensajePrivado; window.enviarFotoEnChat = enviarFotoEnChat; window.borrarMensajeChat = borrarMensajeChat; window.crearNuevaHistoria = crearNuevaHistoria; window.reproducirHistoria = reproducirHistoria; window.terminarVisorHistoria = terminarVisorHistoria; window.verPerfilUsuario = verPerfilUsuario; window.subirImagenPerfil = subirImagenPerfil; window.verSeguidores = verSeguidores; window.cerrarModalListaUI = cerrarModalListaUI; window.verSiguiendo = verSiguiendo; window.borrarComentario = borrarComentario; window.hacerRepulse = hacerRepulse;