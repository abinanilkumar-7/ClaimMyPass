
import React from 'react';
import { AuthPage } from './AuthPage';
import type { AuthUser } from '../../services/authApi';

interface Props {
  onSuccess: (user: AuthUser) => void;
  onSwitchToSignIn: () => void;
  onBack: () => void;
}

export const SignUpPage: React.FC<Props> = ({
  onSuccess,
  onSwitchToSignIn,
  onBack,
}) => (
  <AuthPage
    mode="sign-up"
    onSuccess={onSuccess}
    onSwitchMode={(mode) => {
      if (mode === 'sign-in') onSwitchToSignIn();
    }}
    onBack={onBack}
  />
);
