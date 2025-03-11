import { CreateContest } from '@/components/forms/CreateContest'
import React from 'react'

const page = () => {
    return (
        <div className='max-w-[1200px] mx-auto px-2 my-5'>
            <h1 className='mb-5 text-4xl font-semibold'>Create a new contest</h1>
            <CreateContest />
        </div>
    )
}

export default page