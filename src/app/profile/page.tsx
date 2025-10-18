'use client'

import { useRouter } from "next/navigation";
import { useAuth } from "@/clients/authContext";
import { useSupabaseUserMetadata } from '@/hooks/useSupabaseUserMetadata'
import { fetchUserByUID } from "@/hooks/fetchUserbyUID";
import { useEffect, useState } from "react";
import User from "@/models/user";
import { Button, Input, Textarea, useDisclosure } from "@heroui/react"
import { HexColorPicker } from "react-colorful";

import UserCard from "@/components/userCard";
import { ReusableFadeInComponent } from "@/components/reusableFadeInComponent";


export default function Profile() {
	const router = useRouter()
	const [currentUser, setCurrentUser] = useState<User | null>()
	const [editing, setEditing] = useState(false)
	const { user, loading: authLoading, signOut } = useAuth()
	const { isOpen, onOpen, onClose } = useDisclosure();

	const [username, setUsername] = useState('')
	const [fullname, setFullname] = useState('')
	const [headline, setHeadline] = useState('')
	const [bio, setBio] = useState('')

	const [profileColor, setProfileColor] = useState('')
	
	const ALL_BUTTON_CSS = "my-2 max-w-md"
	
	const setFormFields = () => {
		if (currentUser) {
		setUsername(currentUser.username);
		setFullname(currentUser.fullname);
		setHeadline(currentUser.headline);
		setBio(currentUser.bio);
		}
	};

    useEffect(() => {
        const resolveAuthor = async () => {
            if (user) {
                const data = await fetchUserByUID(user.id)
                setCurrentUser(data)
            }
        }
        resolveAuthor()
    }, [user])

    useEffect(() => {
        setFormFields()
    }, [currentUser])

	const handleFlipEdit = () => {
		setEditing(!editing)
		setFormFields()
	}

	const handleSave = async () => {
		if (currentUser && user) {
			const profile = new User(
				user.id,
				fullname,
				username,
				currentUser.email,
				headline,
				bio,
				currentUser.link,
				profileColor)

			const updatedData = await profile.saveProfile()

			if (updatedData) {
				// Update the state with the new, confirmed data from the database
				// The structure of updatedData might need adjustment depending on your `select` statement.
				// Assuming it returns an object with the same keys as your state:
				setCurrentUser(prevUser => ({
					...prevUser, // Keep all existing user properties
					...updatedData, // Overwrite with the new data
				}));
			}
			handleFlipEdit()
		}
	}

	if (!currentUser) {
		return (
			<div className="flex">
				<div className="flex-1 mx-[5vw] mt-5 h-full">
					<h1 id="header" className="text-3xl font-bold mb-5">Profile not found</h1>
					<p className="my-5 text-xl">We can't seem to load your profile. Something may be wrong, but this text box definitely can't diagnose it for you.</p>
					<p className="my-5 text-xl">Maybe come back later?</p>
				</div>
			</div>
		)
	}

	return (
		<div className="flex">
			<div className="flex-1 mx-[5vw] mt-5 h-full">
				<h1 id="header" className="text-3xl font-bold mb-5">Your profile</h1>

				<div className="w-[1/2]">
					<Input 
						isReadOnly={!editing}
						label="username"
						placeholder="type something..."
						value={username}
						onChange={e => setUsername(e.target.value)}
						className={ALL_BUTTON_CSS}
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
					<p className="font-bold">Profile Card Color: {profileColor}</p>
					<div className="flex">
						<HexColorPicker className="my-4 w-1/2" color={profileColor} onChange={setProfileColor} />
						<div style={{ backgroundColor: `${profileColor}` }} className={`w-1/2 m-3 rounded-2xl`}></div>
					</div>
				</div>

				<div>
					<Button onPress={handleFlipEdit}>{editing ? "Cancel" : "Edit"}</Button>
					<Button onPress={handleSave} className="mx-4 bg-red-400 hover:bg-red-500">Save</Button>
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