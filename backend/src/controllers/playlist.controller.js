import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body

    // Validate required fields
    if (!name || !description) {
        throw new ApiError(400, "Name and description are required")
    }

    // Validate name length
    if (name.trim().length === 0) {
        throw new ApiError(400, "Name cannot be empty")
    }

    // Get authenticated user
    const userId = req.user?._id
    if (!userId) {
        throw new ApiError(401, "User not authenticated")
    }

    // Create playlist
    const playlist = await Playlist.create({
        name: name.trim(),
        description: description.trim(),
        owner: userId,
        videos: []
    })

    // Populate owner details
    const createdPlaylist = await Playlist.findById(playlist._id).populate("owner", "username fullName avatar")

    return res.status(201).json(
        new ApiResponse(201, createdPlaylist, "Playlist created successfully")
    )
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params

    // Validate userId
    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user ID")
    }

    // Get pagination parameters
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 10
    const skip = (page - 1) * limit

    // Get user playlists with aggregation
    const playlists = await Playlist.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails"
            }
        },
        {
            $unwind: "$ownerDetails"
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videoDetails"
            }
        },
        {
            $addFields: {
                totalVideos: { $size: "$videos" },
                totalDuration: { $sum: "$videoDetails.duration" }
            }
        },
        {
            $project: {
                _id: 1,
                name: 1,
                description: 1,
                totalVideos: 1,
                totalDuration: 1,
                createdAt: 1,
                updatedAt: 1,
                owner: {
                    _id: "$ownerDetails._id",
                    username: "$ownerDetails.username",
                    fullName: "$ownerDetails.fullName",
                    avatar: "$ownerDetails.avatar"
                }
            }
        },
        {
            $sort: { createdAt: -1 }
        },
        {
            $skip: skip
        },
        {
            $limit: limit
        }
    ])

    // Get total count
    const totalPlaylists = await Playlist.countDocuments({ owner: userId })
    const totalPages = Math.ceil(totalPlaylists / limit)

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                playlists,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalItems: totalPlaylists,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                }
            },
            "User playlists fetched successfully"
        )
    )
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params

    // Validate playlistId
    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist ID")
    }

    // Get playlist with full details
    const playlist = await Playlist.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(playlistId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails"
            }
        },
        {
            $unwind: "$ownerDetails"
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videoDetails"
            }
        },
        {
            $unwind: {
                path: "$videoDetails",
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "videoDetails.owner",
                foreignField: "_id",
                as: "videoOwnerDetails"
            }
        },
        {
            $unwind: {
                path: "$videoOwnerDetails",
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $group: {
                _id: "$_id",
                name: { $first: "$name" },
                description: { $first: "$description" },
                createdAt: { $first: "$createdAt" },
                updatedAt: { $first: "$updatedAt" },
                owner: { $first: "$ownerDetails" },
                videos: {
                    $push: {
                        $cond: {
                            if: { $ne: ["$videoDetails", null] },
                            then: {
                                _id: "$videoDetails._id",
                                title: "$videoDetails.title",
                                description: "$videoDetails.description",
                                thumbnail: "$videoDetails.thumbnail",
                                videoFile: "$videoDetails.videoFile",
                                duration: "$videoDetails.duration",
                                views: "$videoDetails.views",
                                createdAt: "$videoDetails.createdAt",
                                owner: {
                                    _id: "$videoOwnerDetails._id",
                                    username: "$videoOwnerDetails.username",
                                    fullName: "$videoOwnerDetails.fullName",
                                    avatar: "$videoOwnerDetails.avatar"
                                }
                            },
                            else: "$$REMOVE"
                        }
                    }
                }
            }
        },
        {
            $addFields: {
                totalVideos: { $size: "$videos" },
                totalDuration: { $sum: "$videos.duration" }
            }
        },
        {
            $project: {
                _id: 1,
                name: 1,
                description: 1,
                totalVideos: 1,
                totalDuration: 1,
                createdAt: 1,
                updatedAt: 1,
                videos: 1,
                owner: {
                    _id: "$owner._id",
                    username: "$owner.username",
                    fullName: "$owner.fullName",
                    avatar: "$owner.avatar"
                }
            }
        }
    ])

    if (!playlist.length) {
        throw new ApiError(404, "Playlist not found")
    }

    return res.status(200).json(
        new ApiResponse(200, playlist[0], "Playlist fetched successfully")
    )
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params

    // Validate IDs
    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid playlist or video ID")
    }

    // Get authenticated user
    const userId = req.user?._id
    if (!userId) {
        throw new ApiError(401, "User not authenticated")
    }

    // Find playlist and check ownership
    const playlist = await Playlist.findById(playlistId)
    if (!playlist) {
        throw new ApiError(404, "Playlist not found")
    }

    // Check if user owns the playlist
    if (playlist.owner.toString() !== userId.toString()) {
        throw new ApiError(403, "You don't have permission to modify this playlist")
    }

    // Check if video is already in playlist
    if (playlist.videos.includes(videoId)) {
        throw new ApiError(400, "Video already exists in playlist")
    }

    // Add video to playlist
    playlist.videos.push(videoId)
    await playlist.save()

    return res.status(200).json(
        new ApiResponse(200, playlist, "Video added to playlist successfully")
    )
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params

    // Validate IDs
    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid playlist or video ID")
    }

    // Get authenticated user
    const userId = req.user?._id
    if (!userId) {
        throw new ApiError(401, "User not authenticated")
    }

    // Find playlist and check ownership
    const playlist = await Playlist.findById(playlistId)
    if (!playlist) {
        throw new ApiError(404, "Playlist not found")
    }

    // Check if user owns the playlist
    if (playlist.owner.toString() !== userId.toString()) {
        throw new ApiError(403, "You don't have permission to modify this playlist")
    }

    // Check if video exists in playlist
    if (!playlist.videos.includes(videoId)) {
        throw new ApiError(404, "Video not found in playlist")
    }

    // Remove video from playlist
    playlist.videos = playlist.videos.filter(id => id.toString() !== videoId.toString())
    await playlist.save()

    return res.status(200).json(
        new ApiResponse(200, playlist, "Video removed from playlist successfully")
    )
})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params

    // Validate playlistId
    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist ID")
    }

    // Get authenticated user
    const userId = req.user?._id
    if (!userId) {
        throw new ApiError(401, "User not authenticated")
    }

    // Find playlist and check ownership
    const playlist = await Playlist.findById(playlistId)
    if (!playlist) {
        throw new ApiError(404, "Playlist not found")
    }

    // Check if user owns the playlist
    if (playlist.owner.toString() !== userId.toString()) {
        throw new ApiError(403, "You don't have permission to delete this playlist")
    }

    // Delete playlist
    await Playlist.findByIdAndDelete(playlistId)

    return res.status(200).json(
        new ApiResponse(200, {}, "Playlist deleted successfully")
    )
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body

    // Validate playlistId
    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist ID")
    }

    // Validate required fields
    if (!name && !description) {
        throw new ApiError(400, "At least one field (name or description) is required")
    }

    // Get authenticated user
    const userId = req.user?._id
    if (!userId) {
        throw new ApiError(401, "User not authenticated")
    }

    // Find playlist and check ownership
    const playlist = await Playlist.findById(playlistId)
    if (!playlist) {
        throw new ApiError(404, "Playlist not found")
    }

    // Check if user owns the playlist
    if (playlist.owner.toString() !== userId.toString()) {
        throw new ApiError(403, "You don't have permission to update this playlist")
    }

    // Update fields
    const updateData = {}
    if (name) {
        if (name.trim().length === 0) {
            throw new ApiError(400, "Name cannot be empty")
        }
        updateData.name = name.trim()
    }
    if (description) {
        updateData.description = description.trim()
    }

    // Update playlist
    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        updateData,
        { new: true }
    ).populate("owner", "username fullName avatar")

    return res.status(200).json(
        new ApiResponse(200, updatedPlaylist, "Playlist updated successfully")
    )
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}