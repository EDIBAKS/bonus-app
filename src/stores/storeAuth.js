import { defineStore } from 'pinia';
import { supabase } from 'src/boot/supabase';
import { useShowErrorMessage } from 'src/use/useShowErrorMessage';
//import { useStoreEntries } from './storeEntries';
import { useRouter } from 'vue-router';
import { reactive, ref, onUnmounted } from 'vue';
import { useBonusStore } from './bonusStore';
export const useStoreAuth = defineStore('auth', () => {
  const INACTIVITY_LIMIT = 10 * 60 * 1000; // 10 minutes
  let inactivityTimer;

  const userDetailsDefault = {
    id: null,
    email: null,
    names: null,
    username: null,
    telephone: null,
    role: null,
    department: null
  };

  const userDetails = reactive({ ...userDetailsDefault });

  // Load user details from localStorage
  const loadUserDetailsFromStorage = () => {
    const storedDetails = localStorage.getItem('userDetails');
    if (storedDetails) {
      Object.assign(userDetails, JSON.parse(storedDetails));
    }
  };

  // Save user details to localStorage
  const saveUserDetailsToStorage = () => {
    localStorage.setItem('userDetails', JSON.stringify(userDetails));
  };

  loadUserDetailsFromStorage();

  // Reset inactivity timer
  const resetInactivityTimer = () => {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
      logoutUser(); // 🔥 Auto logout on inactivity
    }, INACTIVITY_LIMIT);
  };

  // Start inactivity tracking
  const startInactivityTimer = () => {
    window.addEventListener('mousemove', resetInactivityTimer);
    window.addEventListener('keydown', resetInactivityTimer);
    window.addEventListener('touchstart', resetInactivityTimer);
    resetInactivityTimer();
  };

  const fetchUserDetails = async (userId) => {
    const { data: userDetailsData, error } = await supabase.from('users').select('*').eq('id', userId).single();
    if (error) {
      useShowErrorMessage(error.message);
      return;
    }
    Object.assign(userDetails, userDetailsData);
    saveUserDetailsToStorage();
  };


  


  

  const registerUser = async ({ email, password, names, username, telephone, role, department }) => {
    let { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      useShowErrorMessage(error.message);
      return;
    }
    if (data?.user) {
      const { error: userError } = await supabase.from('users').insert([
        { id: data.user.id, names, username, telephone, role, department, email }
      ]);
      if (userError) {
        useShowErrorMessage(userError.message);
        return;
      }
      await fetchUserDetails(data.user.id);
    }
  };

 

  const loginUser = async ({ email, password }) => {
    let { data, error } = await supabase.auth.signInWithPassword({ email, password });
  
    if (error) {
      useShowErrorMessage(error.message);
      return;
    }
  
    if (data?.user) {
      userDetails.id = data.user.id;
      userDetails.email = data.user.email;
      await fetchUserDetails(data.user.id);
      startInactivityTimer();
  
      // Get the accurate local time
      const now = new Date();
      const formattedDateTime = now.toISOString(); // Stores in UTC format
  
      // Update LastLogin in the database
      await supabase
        .from('users')
        .update({ LastLogin: formattedDateTime })
        .eq('id', data.user.id);
    }
  };
 
  



  const logoutUser2 = async () => {
    clearTimeout(inactivityTimer);
  
    if (userDetails.id) {
      // Update LastLogout time
      const { error: updateError } = await supabase
        .from('users')
        .update({ LastLogOut: new Date().toISOString() })  // Current timestamp
        .eq('id', userDetails.id);
  
      if (updateError) {
        console.error("Error updating LastLogOut:", updateError.message);
      }
    }
  
    let { error } = await supabase.auth.signOut();
    if (error) {
      useShowErrorMessage(error.message);
    } else {
      Object.assign(userDetails, userDetailsDefault);
      localStorage.removeItem('userDetails');
    }
  };

  const logoutUser = async () => {
    clearTimeout(inactivityTimer);
  
    // Get the accurate local time
    const now = new Date();
    const formattedDateTime = now.toISOString(); // Stores in UTC format
  
    // Update LastLogOut in the database
    await supabase
      .from('users')
      .update({ LastLogOut: formattedDateTime })
      .eq('id', userDetails.id);
  
    let { error } = await supabase.auth.signOut();
    if (error) {
      useShowErrorMessage(error.message);
    } else {
      Object.assign(userDetails, userDetailsDefault);
      localStorage.removeItem('userDetails');
    }
  };
  
  

  const init = () => {
    const router = useRouter(),
    bonusEntries = useBonusStore();
    
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        if (session?.user) {
          //initial fetch of user ID and email
          userDetails.id = session.user.id;
          userDetails.email = session.user.email;
          //additional user details will be fetched here by calling an external fn
          //then a redirect if user is valid
          await fetchUserDetails(session.user.id);
          router.push('/');
          //storeEntries.loadEntries();
          startInactivityTimer();
        }
      } else if (event === 'SIGNED_OUT') {
        clearTimeout(inactivityTimer);
        router.replace('/auth');
        bonusEntries.unsubscribeFromBonuses();
        bonusEntries.clearEntries();
        //here the user login info is dumped
        Object.assign(userDetails, userDetailsDefault);
        localStorage.removeItem('userDetails');
      }
    });
  };


  
  

  onUnmounted(() => {
    window.removeEventListener('mousemove', resetInactivityTimer);
    window.removeEventListener('keydown', resetInactivityTimer);
    window.removeEventListener('touchstart', resetInactivityTimer);
    clearTimeout(inactivityTimer);
  });

  return {
    userDetails,
    fetchUserDetails,
    init,
    registerUser,
    loginUser,
    logoutUser
  };
});
