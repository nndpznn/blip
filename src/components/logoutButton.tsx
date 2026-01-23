'use client'; // For Next.js 13+ app router

import { supabase } from '../clients/supabaseClient';
import { Button, ButtonProps } from '@heroui/react';
import { useRouter } from 'next/navigation';

// interface LogoutButtonProps extends ButtonProps {}

export default function LogoutButton(props: ButtonProps) {
	const router = useRouter();

	const handleLogout = async () => {

		const { error } = await supabase.auth.signOut()
		if (error) {
			console.error('Error signing out:', error.message)
		} else {
			console.log('Successfully signed out')
			router.push('/')
		}
	}

  return (
    <Button
      onPress={handleLogout}
	  {...props}
    >
      sign out
    </Button>
  );
}
