import { useState } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

export default function App() {
  const [user, setUser] = useState<string | null>(() => sessionStorage.getItem('ut_user'));

  if (!user) {
    return (
      <Login
        onLogin={(u) => {
          sessionStorage.setItem('ut_user', u);
          setUser(u);
        }}
      />
    );
  }

  return (
    <Dashboard
      user={user}
      onLogout={() => {
        sessionStorage.removeItem('ut_user');
        setUser(null);
      }}
    />
  );
}
