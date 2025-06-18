import { Button } from '@heroui/react';
import { supabase } from '../clients/supabaseClient';

const LoginWithGoogle = () => {
	const signInWithGoogle = async () => {
		const { error } = await supabase.auth.signInWithOAuth({
			provider: 'google',
			options: {
				redirectTo: `http://localhost:3000/map`,
			},
		});

		if (error) {
			console.error('Error signing in with Google:', error.message);
		} else {
			console.log('Redirecting to Google sign-in...');
		}
	}

	return (
		<Button onPress={signInWithGoogle} color="primary" className="mt-10">
			Google Sign-In
		</Button>
	)
}

export default LoginWithGoogle;	