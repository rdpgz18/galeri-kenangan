import { auth, db } from './firebase-config.js';

// DOM Elements
const authButtons = document.getElementById('authButtons');
const userMenu = document.getElementById('userMenu');
const userBtn = document.getElementById('userBtn');
const userAvatar = document.getElementById('userAvatar');
const userName = document.getElementById('userName');
const dropdownMenu = document.getElementById('dropdownMenu');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const logoutBtn = document.getElementById('logoutBtn');
const loginModal = document.getElementById('loginModal');
const registerModal = document.getElementById('registerModal');
const closeLoginModal = document.getElementById('closeLoginModal');
const closeRegisterModal = document.getElementById('closeRegisterModal');
const showRegisterBtn = document.getElementById('showRegisterBtn');
const showLoginBtn = document.getElementById('showLoginBtn');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const uploadSection = document.getElementById('uploadSection');
const createAlbumBtn = document.getElementById('createAlbumBtn');

// Auth state listener
auth.onAuthStateChanged(user => {
    if (user) {
        // User is signed in
        authButtons.classList.add('hidden');
        userMenu.classList.remove('hidden');
        uploadSection.classList.remove('hidden');
        createAlbumBtn.classList.remove('hidden');
        
        // Update user info
        userName.textContent = user.displayName || user.email.split('@')[0];
        userAvatar.src = user.photoURL || 'https://via.placeholder.com/32';
        
        // Load user data from Firestore
        db.collection('users').doc(user.uid).get().then(doc => {
            if (doc.exists) {
                const userData = doc.data();
                if (userData.photoURL) {
                    userAvatar.src = userData.photoURL;
                }
                if (userData.displayName) {
                    userName.textContent = userData.displayName;
                }
            }
        });
    } else {
        // User is signed out
        authButtons.classList.remove('hidden');
        userMenu.classList.add('hidden');
        uploadSection.classList.add('hidden');
        createAlbumBtn.classList.add('hidden');
    }
});

// Event Listeners
loginBtn.addEventListener('click', () => {
    loginModal.classList.remove('hidden');
});

registerBtn.addEventListener('click', () => {
    registerModal.classList.remove('hidden');
});

logoutBtn.addEventListener('click', () => {
    auth.signOut().then(() => {
        console.log('User signed out');
    }).catch(error => {
        console.error('Sign out error:', error);
    });
});

userBtn.addEventListener('click', () => {
    dropdownMenu.classList.toggle('hidden');
});

closeLoginModal.addEventListener('click', () => {
    loginModal.classList.add('hidden');
});

closeRegisterModal.addEventListener('click', () => {
    registerModal.classList.add('hidden');
});

showRegisterBtn.addEventListener('click', () => {
    loginModal.classList.add('hidden');
    registerModal.classList.remove('hidden');
});

showLoginBtn.addEventListener('click', () => {
    registerModal.classList.add('hidden');
    loginModal.classList.remove('hidden');
});

// Login form submission
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    auth.signInWithEmailAndPassword(email, password)
        .then(() => {
            loginModal.classList.add('hidden');
            loginForm.reset();
        })
        .catch(error => {
            alert('Login error: ' + error.message);
        });
});

// Register form submission
registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    
    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Add user data to Firestore
            return db.collection('users').doc(userCredential.user.uid).set({
                displayName: name,
                email: email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        })
        .then(() => {
            registerModal.classList.add('hidden');
            registerForm.reset();
        })
        .catch(error => {
            alert('Registration error: ' + error.message);
        });
});

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (!userMenu.contains(e.target)) {
        dropdownMenu.classList.add('hidden');
    }
});
