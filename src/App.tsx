/**
 * MOTIX – Personal Digital Security Vault
 * Brand: MOTIX by Moti Technologies
 * Tagline: "Your Digital World. Your Private Space."
 */

import React from 'react';
import { VaultProvider, useVault } from './context/VaultContext';
import { VaultAuth } from './components/VaultAuth';
import { VaultShell } from './components/VaultShell';

function VaultMain() {
  const { status } = useVault();

  if (status === 'uninitialized' || status === 'locked') {
    return <VaultAuth />;
  }

  return <VaultShell />;
}

export default function App() {
  return (
    <VaultProvider>
      <VaultMain />
    </VaultProvider>
  );
}
