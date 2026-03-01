'use client'

import { useAuth } from "@/clients/authContext";
import { supabase } from "@/clients/supabaseClient";
import { fetchUserByUID } from "@/hooks/fetchUserbyUID";
import { useEffect, useState, useCallback } from "react";
import User, { ProfileRow } from "@/models/user";
import { Button, Input, useDisclosure } from "@heroui/react"
import { HexColorPicker } from "react-colorful";

import UserCard from "@/components/userCard";
import { ReusableFadeInComponent } from "@/components/reusableFadeInComponent";


export default function Profile() {
	const [currentUser, setCurrentUser] = useState<ProfileRow | null>(null)
	const [editing, setEditing] = useState(false)
	const { user } = useAuth()
	const { isOpen, onOpen, onClose } = useDisclosure();

	const [username, setUsername] = useState('')
	const [fullname, setFullname] = useState('')
	const [headline, setHeadline] = useState('')
	const [bio, setBio] = useState('')

	const [profileColor, setProfileColor] = useState('')
	const [usernameTakenWarning, setUsernameTakenWarning] = useState<string | null>(null)
	
	const ALL_BUTTON_CSS = "my-2 max-w-md"
	
	const setFormFields = useCallback((data?: ProfileRow | null) => {
		const u = data ?? currentUser
		if (u) {
			setUsername(u.username);
			setFullname(u.fullname);
			setHeadline(u.headline);
			setBio(u.bio);
			setProfileColor(u.profile_color)
		}
	}, [currentUser]);

    useEffect(() => {
        const resolveAuthor = async () => {
            if (user) {
                const data = await fetchUserByUID(user.id)
                setCurrentUser(data)
                setFormFields(data)
            }
        }
        resolveAuthor()
        // Omit setFormFields: including it would re-run whenever currentUser changes (it's in setFormFields's deps), resetting the form while editing.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user])

	const handleFlipEdit = () => {
		setEditing(!editing)
		setFormFields()
		setUsernameTakenWarning(null)
	}

	const handleSave = async () => {
		if (currentUser && user) {
			setUsernameTakenWarning(null)

			// Check if username is already taken by another user
			const { data: existingUser } = await supabase
				.from('profiles')
				.select('id')
				.eq('username', username.trim())
				.maybeSingle()

			if (existingUser && existingUser.id !== user.id) {
				setUsernameTakenWarning(`Username "${username.trim()}" is already taken. Please choose a different one.`)
				return
			}

			const profile = new User(
				user.id,
				fullname,
				username.trim(),
				currentUser.email,
				headline,
				bio,
				currentUser.link,
				profileColor)

			const updatedData = await profile.saveProfile()

			if (updatedData) {
				// updatedData is a ProfileRow (plain object), so this works!
				setCurrentUser(updatedData);
				setFormFields(updatedData);
			}
			setEditing(false);
		}
	}

	if (!currentUser) {
		return (
			<div className="flex">
				<div className="flex-1 mx-[5vw] mt-5 h-full">
					<h1 id="header" className="text-3xl font-bold mb-5">Profile not found</h1>
					<p className="my-5 text-xl">We can&apos;t seem to load your profile. Something may be wrong, but this text box definitely can&apos;t diagnose it for you.</p>
					<p className="my-5 text-xl">Maybe come back later?</p>
				</div>
			</div>
		)
	}

	return (
		<div className="flex">
			<div className="flex-1 mx-[5vw] mt-5 h-full">
				<div className="flex mb-5 items-center">
					<h1 id="header" className="text-3xl font-bold">Your Profile</h1>
					{editing && (
						<div className="mx-2 bg-red-400 px-2 py-1 rounded-2xl">
							<p className="font-bold text-lg">Editing</p>
						</div>
					)}
				</div>

				<div className="w-[1/2]">
					<Input 
						isReadOnly={!editing}
						label="username"
						placeholder="type something..."
						value={username}
						onChange={e => {
							setUsername(e.target.value)
							setUsernameTakenWarning(null)
						}}
						className={ALL_BUTTON_CSS}
						isInvalid={!!usernameTakenWarning}
						color={usernameTakenWarning ? "danger" : "default"}
						errorMessage={usernameTakenWarning ?? undefined}
					></Input>
					<Input 
						isReadOnly={!editing}
						label="name" 
						placeholder="type something..." 
						value={fullname}
						onChange={e => setFullname(e.target.value)}
						className={ALL_BUTTON_CSS}
					></Input>
					<Input 
						isReadOnly={!editing}
						label="headline" 
						placeholder="type something..." 
						value={headline}
						onChange={e => setHeadline(e.target.value)}
						className={ALL_BUTTON_CSS}
					></Input>
					<Input 
						isReadOnly={!editing}
						label="bio" 
						placeholder="type something..." 
						value={bio}
						onChange={e => setBio(e.target.value)}
						className={ALL_BUTTON_CSS}
					></Input>
					<Input 
						isReadOnly={!editing}
						label="profile card color" 
						placeholder="type something..." 
						value={profileColor}
						onChange={e => setProfileColor(e.target.value)}
						className={ALL_BUTTON_CSS}
					></Input>
					<div className="flex">
						<HexColorPicker 
							className="my-4 w-1/2" 
							color={profileColor} 
							onChange={(newColor) => {
								if (editing) {
								setProfileColor(newColor);
								}
							}}
							 />
						<div style={{ backgroundColor: `${profileColor}` }} className={`w-2/5 m-3 rounded-2xl`}></div>
					</div>
				</div>

				<div>
					<Button onPress={handleFlipEdit}>{editing ? "Cancel" : "Edit"}</Button>
					{(editing) && (
						<Button disabled={!editing} onPress={handleSave} className="mx-4 bg-red-400 disabled:bg-gray-400 hover:bg-red-500">Save</Button>
					)}
					
				</div>
			</div>

			<div className="flex-1 mx-[5vw] mt-5">
				<h1 id="header" className="text-3xl font-bold mb-5">Should look something like...</h1>

				<UserCard user={currentUser} />

				<Button color="primary" className="my-2" onPress={onOpen}>Display Card</Button>
			</div>

			<ReusableFadeInComponent isOpen={isOpen} onClose={onClose}>
				<UserCard 
					user={currentUser}
				/>
			</ReusableFadeInComponent>
		</div>
	)
}