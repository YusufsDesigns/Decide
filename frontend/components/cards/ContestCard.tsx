import Link from "next/link"

const ContestCard = ({ id, name, description, creator }: { id: string, name: string, description: string, creator: string }) => {
    return (
        <Link href={`contests/${id}`} className="flex items-start flex-col gap-2 p-4 bg-[#1f2f3f] rounded-md">
            <span className="text-xs text-gray-400">Created by {creator}</span>
            <h2 className="font-semibold text-2xl line-clamp-1">{name}</h2>
            <p className="line-clamp-3">{description}</p>
            <button className="flex cursor-pointer items-center justify-center overflow-hidden rounded-sm h-10 px-4 bg-[#223c49] text-white text-sm font-bold">
                <span className="truncate">View Contests</span>
            </button>
        </Link>
    )
}

export default ContestCard