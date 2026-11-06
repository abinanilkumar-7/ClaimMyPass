
import React from 'react';
import { AuthPage } from './AuthPage';
import type { AuthUser } from '../../services/authApi';

interface Props {
  onSuccess: (user: AuthUser) => void;
  onSwitchToSignUp: () => void;
  onBack: () => void;
  onForgotPassword: () => void;
}

export const SignInPage: React.FC<Props> = ({
  onSuccess,
  onSwitchToSignUp,
  onBack,
  onForgotPassword,
}) => (
  <AuthPage
    mode="sign-in"
    onSuccess={onSuccess}
    onSwitchMode={(mode) => {
      if (mode === 'sign-up') onSwitchToSignUp();
    }}
    onBack={onBack}
    onForgotPassword={onForgotPassword}
  />
);
