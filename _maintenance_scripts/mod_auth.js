const fs = require('fs');
let html = fs.readFileSync('d:/Mentra_Solution/mentra-manager/products.html', 'utf8');

// Add getDoc to firestore imports
html = html.replace(/getDocs, doc, updateDoc/, 'getDoc, getDocs, doc, updateDoc');

// Replace onAuthStateChanged logic
const targetAuth = `    onAuthStateChanged(auth, user => {
        if (!user) {
            window.location.href = 'index.html';
        } else {
            document.body.style.display = 'block';
            document.getElementById("userAvatar").textContent = user.email.charAt(0).toUpperCase();
            document.getElementById("userName").textContent = user.displayName || user.email;
            fetchProducts();
        }
    });`;

const replacementAuth = `    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = 'index.html';
            return;
        }
        
        try {
            const snap = await getDoc(doc(db, 'users', user.uid));
            if (snap.exists()) {
                const userData = snap.data();
                document.getElementById("userAvatar").textContent = (userData.firstName || user.displayName || user.email).charAt(0).toUpperCase();
                document.getElementById("userName").textContent = userData.displayName || userData.firstName || user.displayName || user.email;
                
                const role = userData.role || 'user';
                const badge = document.getElementById('userRoleBadge');
                if (badge) {
                    badge.textContent = role === 'admin' ? 'Admin' : 'User';
                    badge.className = \`role-badge \${role}\`;
                }

                if (role === 'admin') {
                    const adminMenu = document.getElementById('adminMenu');
                    if (adminMenu) adminMenu.style.display = 'flex';
                }
            } else {
                document.getElementById("userAvatar").textContent = user.email.charAt(0).toUpperCase();
                document.getElementById("userName").textContent = user.displayName || user.email;
            }
        } catch (e) {
            console.error("Error fetching user role:", e);
        }

        document.body.style.display = 'block';
        fetchProducts();
    });`;

html = html.replace(targetAuth, replacementAuth);

fs.writeFileSync('d:/Mentra_Solution/mentra-manager/products.html', html);
console.log("Updated auth and admin menu logic");
