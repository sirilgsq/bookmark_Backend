// Frontend Authentication Example
// This shows how to get the ID token and call your backend auth endpoint

import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    GoogleAuthProvider, 
    signInWithPopup, 
    signOut,
    onAuthStateChanged 
} from 'firebase/auth';

// 1. Initialize Firebase (replace with your config)
const firebaseConfig = {
    apiKey: "your-api-key",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "your-app-id"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// 2. Your backend API endpoint
const API_BASE_URL = 'https://your-region-your-project.cloudfunctions.net/api';

// 3. Sign in with Google and get ID token
async function signInWithGoogle() {
    try {
        // Sign in with Google popup
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        
        // THIS IS THE KEY PART: Get the ID token
        const idToken = await user.getIdToken();
        console.log('ID Token:', idToken);
        
        // Send ID token to your backend
        const response = await fetch(`${API_BASE_URL}/auth/google`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                idToken: idToken  // Send the ID token to your backend
            })
        });

        const data = await response.json();
        
        if (data.success) {
            console.log('Authentication successful:', data.data.user);
            return data.data.user;
        } else {
            throw new Error(data.message);
        }
        
    } catch (error) {
        console.error('Authentication error:', error);
        throw error;
    }
}

// 4. Make authenticated requests to your backend
async function makeAuthenticatedRequest(endpoint, options = {}) {
    const user = auth.currentUser;
    if (!user) {
        throw new Error('User not authenticated');
    }

    // Get fresh ID token for each request
    const idToken = await user.getIdToken();
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`  // Use ID token for authorization
        }
    };

    const finalOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };

    return fetch(`${API_BASE_URL}${endpoint}`, finalOptions);
}

// 5. Example usage
async function exampleUsage() {
    try {
        // Sign in user
        const user = await signInWithGoogle();
        console.log('User signed in:', user);
        
        // Make authenticated request to get bookmarks
        const bookmarksResponse = await makeAuthenticatedRequest('/bookmarks');
        const bookmarks = await bookmarksResponse.json();
        console.log('User bookmarks:', bookmarks);
        
        // Example: Create a new group first
        const newGroupResponse = await makeAuthenticatedRequest('/groups', {
            method: 'POST',
            body: JSON.stringify({
                name: 'My New Group'
            })
        });
        const newGroup = await newGroupResponse.json();
        console.log('Created group:', newGroup);
        
        // Example: Create a new bookmark in the group
        if (newGroup.success && newGroup.data) {
            const newBookmarkResponse = await makeAuthenticatedRequest('/bookmarks', {
                method: 'POST',
                body: JSON.stringify({
                    title: 'My New Bookmark',
                    url: 'https://example.com',
                    groupId: newGroup.data.groupId
                })
            });
            const newBookmark = await newBookmarkResponse.json();
            console.log('Created bookmark:', newBookmark);
        }
        
    } catch (error) {
        console.error('Error:', error);
    }
}

// 6. Listen for auth state changes
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log('User is signed in:', user.uid);
        // User is signed in, you can make authenticated requests
    } else {
        console.log('User is signed out');
        // User is signed out
    }
});

// 7. Sign out function
async function signOutUser() {
    try {
        await signOut(auth);
        console.log('User signed out');
    } catch (error) {
        console.error('Sign out error:', error);
    }
}

// Export functions for use in your app
export {
    signInWithGoogle,
    makeAuthenticatedRequest,
    signOutUser,
    auth
};
