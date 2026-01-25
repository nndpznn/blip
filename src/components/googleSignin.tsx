import { Button } from '@heroui/react';
import { supabase } from '../clients/supabaseClient';

const LoginWithGoogle = () => {
	const signInWithGoogle = async () => {
		const { error } = await supabase.auth.signInWithOAuth({
			provider: 'google',
			options: {
				redirectTo: `localhost:3000/map`,
			},
		});

		if (error) {
			console.error('Error signing in with Google:', error.message);
		} else {
			console.log('Redirecting to Google sign-in...');
		}
	}

	return (
		<Button onPress={signInWithGoogle} className="mt-10 bg-transparent border rounded-4xl hover:bg-gray-900 px-10">
			Sign In with Google
		</Button>
	)
}

export default LoginWithGoogle;	