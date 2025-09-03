import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination
    
    // Build match condition
    const matchCondition = {
        isPublished: true
    }
    
    // Add text search if query is provided
    if (query) {
        matchCondition.$or = [
            { title: { $regex: query, $options: "i" } },
            { description: { $regex: query, $options: "i" } }
        ]
    }
    
    // Add userId filter if provided
    if (userId) {
        if (!isValidObjectId(userId)) {
            throw new ApiError(400, "Invalid userId")
        }
        matchCondition.owner = new mongoose.Types.ObjectId(userId)
    }
    
    // Build sort condition
    const sortCondition = {}
    if (sortBy && sortType) {
        sortCondition[sortBy] = sortType === "desc" ? -1 : 1
    } else {
        sortCondition.createdAt = -1 // Default sort by newest
    }
    
    // Aggregation pipeline
    const pipeline = [
        {
            $match: matchCondition
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            "avatar.url": 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                owner: {
                    $first: "$ownerDetails"
                }
            }
        },
        {
            $project: {
                ownerDetails: 0
            }
        },
        {
            $sort: sortCondition
        }
    ]
    
    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
    }
    
    const videos = await Video.aggregatePaginate(
        Video.aggregate(pipeline),
        options
    )
    
    return res.status(200).json(
        new ApiResponse(200, videos, "Videos fetched successfully")
    )
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    // TODO: get video, upload to cloudinary, create video

    // Validate required fields
    if (!title || !description) {
        throw new ApiError(400, "Title and description are required")
    }
    
    // Check if video file and thumbnail are uploaded
    const videoFileLocalPath = req.files?.videoFile?.[0]?.path
    const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path
    
    if (!videoFileLocalPath) {
        throw new ApiError(400, "Video file is required")
    }
    
    if (!thumbnailLocalPath) {
        throw new ApiError(400, "Thumbnail is required")
    }
    
    // Upload to cloudinary
    const videoFile = await uploadOnCloudinary(videoFileLocalPath)
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)
    
    if (!videoFile) {
        throw new ApiError(400, "Error while uploading video file")
    }
    
    if (!thumbnail) {
        throw new ApiError(400, "Error while uploading thumbnail")
    }
    
    // Create video document
    const video = await Video.create({
        title,
        description,
        duration: videoFile.duration,
        videoFile: videoFile.url,
        thumbnail: thumbnail.url,
        owner: req.user._id
    })
    
    const createdVideo = await Video.findById(video._id).populate("owner", "username avatar")
    
    if (!createdVideo) {
        throw new ApiError(500, "Something went wrong while uploading the video")
    }
    
    return res.status(201).json(
        new ApiResponse(201, createdVideo, "Video uploaded successfully")
    )
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId")
    }
    
    const video = await Video.findById(videoId).populate("owner", "username avatar")
    
    if (!video) {
        throw new ApiError(404, "Video not found")
    }
    
    // Increment view count
    await Video.findByIdAndUpdate(videoId, {
        $inc: { views: 1 }
    })
    
    return res.status(200).json(
        new ApiResponse(200, video, "Video fetched successfully")
    )
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail

     const { title, description } = req.body
    
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId")
    }
    
    // Check if video exists
    const video = await Video.findById(videoId)
    
    if (!video) {
        throw new ApiError(404, "Video not found")
    }
    
    // Check if user is owner of the video
    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You can only update your own videos")
    }
    
    // Update fields
    const updateFields = {}
    if (title) updateFields.title = title
    if (description) updateFields.description = description
    
    // Check if thumbnail is uploaded
    const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path
    if (thumbnailLocalPath) {
        const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)
        if (thumbnail) {
            updateFields.thumbnail = thumbnail.url
        }
    }
    
    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        { $set: updateFields },
        { new: true }
    ).populate("owner", "username avatar")
    
    return res.status(200).json(
        new ApiResponse(200, updatedVideo, "Video updated successfully")
    )

})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId")
    }
    
    const video = await Video.findById(videoId)
    
    if (!video) {
        throw new ApiError(404, "Video not found")
    }
    
    // Check if user is owner of the video
    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You can only delete your own videos")
    }
    
    await Video.findByIdAndDelete(videoId)
    
    return res.status(200).json(
        new ApiResponse(200, {}, "Video deleted successfully")
    )
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId")
    }
    
    const video = await Video.findById(videoId)
    
    if (!video) {
        throw new ApiError(404, "Video not found")
    }
    
    // Check if user is owner of the video
    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You can only modify your own videos")
    }
    
    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        { $set: { isPublished: !video.isPublished } },
        { new: true }
    ).populate("owner", "username avatar")
    
    return res.status(200).json(
        new ApiResponse(200, updatedVideo, "Video publish status updated successfully")
    )
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}