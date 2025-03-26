import { defineStore } from 'pinia';
import { supabase } from 'src/boot/supabase';
import { useShowErrorMessage } from 'src/use/useShowErrorMessage';
import { useRouter } from 'vue-router';
import { reactive, ref,onMounted, onUnmounted } from 'vue';
import { useBonusStore } from './bonusStore';

export const useStoreAuth = defineStore('auth', () => {
  const INACTIVITY_LIMIT = 10 * 60 * 1000; // 10 minutes
  let inactivityTimer;
  let isInactivityTrackingActive = false; // Prevent duplicate event listeners

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

  // Reset inactivity timer efficiently
  const resetInactivityTimer1 = () => {
    if (inactivityTimer) clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => logoutUser(), INACTIVITY_LIMIT);
  };

  // Reset inactivity timer efficiently
const resetInactivityTimer = () => {
  console.log('Activity detected, resetting timer'); // Debugging
  if (inactivityTimer) clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(() => {
    console.log('User inactive, logging out'); // Debugging
    logoutUser();
  }, INACTIVITY_LIMIT);
};

  // Start inactivity tracking with optimized event listeners
  const startInactivityTimer1 = () => {
    if (isInactivityTrackingActive) return;
    isInactivityTrackingActive = true;
    
    window.addEventListener('mousemove', resetInactivityTimer, { passive: true });
    window.addEventListener('keydown', resetInactivityTimer, { passive: true });
    window.addEventListener('touchstart', resetInactivityTimer, { passive: true });
    
    resetInactivityTimer();
  };

  // Start inactivity tracking with optimized event listeners
const startInactivityTimer = () => {
  console.log('Starting inactivity timer'); // Debugging

  // Remove previous listeners to avoid duplicates
  window.removeEventListener('mousemove', resetInactivityTimer);
  window.removeEventListener('keydown', resetInactivityTimer);
  window.removeEventListener('touchstart', resetInactivityTimer);
  window.removeEventListener('click', resetInactivityTimer);
  window.removeEventListener('scroll', resetInactivityTimer);
  window.removeEventListener('wheel', resetInactivityTimer);

  // Attach listeners to reset the timer on user activity
  window.addEventListener('mousemove', resetInactivityTimer, { passive: true });
  window.addEventListener('keydown', resetInactivityTimer, { passive: true });
  window.addEventListener('touchstart', resetInactivityTimer, { passive: true });
  window.addEventListener('click', resetInactivityTimer, { passive: true });
  window.addEventListener('scroll', resetInactivityTimer, { passive: true });
  window.addEventListener('wheel', resetInactivityTimer, { passive: true });

  // Start/reset the timer
  resetInactivityTimer();
};

  const fetchUserDetails = async (userId) => {
    //if (!userId || userDetails.id === userId) return; // Avoid redundant fetches
    
    const { data: userDetailsData, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
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
      await supabase.from('users').update({ LastLogin: new Date().toISOString() }).eq('id', data.user.id);
    }
  };

  const logoutUser = async () => {
    clearTimeout(inactivityTimer);
    await supabase.from('users').update({ LastLogOut: new Date().toISOString() }).eq('id', userDetails.id);
    let { error } = await supabase.auth.signOut();
    if (error) {
      useShowErrorMessage(error.message);
    } else {
      Object.assign(userDetails, userDetailsDefault);
      localStorage.removeItem('userDetails');
    }
  };

  const init = () => {
    const router = useRouter(), bonusEntries = useBonusStore();
    
    supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user && userDetails.id !== session.user.id) {
        userDetails.id = session.user.id;
        userDetails.email = session.user.email;
        await fetchUserDetails(session.user.id);
        router.push('/');
        startInactivityTimer();
      } else if (event === 'SIGNED_OUT') {
        clearTimeout(inactivityTimer);
        router.replace('/auth');
        bonusEntries.unsubscribeFromBonuses();
        bonusEntries.clearEntries();
        Object.assign(userDetails, userDetailsDefault);
        localStorage.removeItem('userDetails');
      }
    });
  };

  onMounted(() => {
    console.log('Component mounted, starting inactivity timer');
    startInactivityTimer();
  });

  onUnmounted(() => {
    console.log('Component unmounted, cleaning up inactivity timer');
    window.removeEventListener('mousemove', resetInactivityTimer);
    window.removeEventListener('keydown', resetInactivityTimer);
    window.removeEventListener('touchstart', resetInactivityTimer);
    window.removeEventListener('click', resetInactivityTimer);
    window.removeEventListener('scroll', resetInactivityTimer);
    window.removeEventListener('wheel', resetInactivityTimer);
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
