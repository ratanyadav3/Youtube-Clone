import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import {ApiResponse} from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const generateAcessTokenAndRefreshToken = async(userId)=>{

    try {
        const user = await User.findById(userId);
    
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
    
        
        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave:false});
      
       

        return{accessToken,refreshToken};

        

    } catch (error) {
        throw new ApiError(500,"Something went wrong");
    }
    
}

const registerUser = asyncHandler(async(req,res)=>{

    console.log(req.body);
    const{ fullName,email,username,password } = req.body;
    if(
        [fullName,email,username,password].some((field)=>field?.trim()==="")
    ){
        throw new ApiError(400,"All fields are required");
    }

    //const userExist = await User.findOne({$or:[{username},{email}]});
     const userExist = await User.findOne({email});

    if(userExist){
        throw new ApiError(409,"User with email or username already exist");
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
   
    
     let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }
    //console.log("Cover Image Local path ".coverImageLocalPath);

    if(!avatarLocalPath)
    {
        throw new ApiError(400,"Avatar file is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    
    if(!avatar){
        throw new ApiError(400,"Avatar file is required");
    }

    const user = await User.create({
        fullName,
        avatar:avatar.url,
        coverImage:coverImage?.url || "",
        email,
        password,
        username:username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser)
    {
        throw new ApiError(500,"Something went wrong while registering user")
    }

    return res.status(201).json(
        new ApiResponse(200,createdUser,"User Register successfully")
    )
})

const userLogin = asyncHandler(async(req,res)=>{

    const{ email,username,password } = req.body;

    if(!email && !username)
    {
        throw new ApiError(400,"Enter username or email");
    }


    const user = await User.findOne({$or:[{email},{username}]});
    if(!user)
    {
        throw new ApiError(400,"Invalid Credential");
    }


    const checkPassword = await user.isPasswordCorrect(password);
    if(!checkPassword)
    {
        throw new ApiError(400,"Entered credentials are incorrect");
    }
  
    //console.log(user._id);
    const{ accessToken,refreshToken } = await generateAcessTokenAndRefreshToken(user._id);
    
    //console.log(`refreshToken ${refreshToken} accesToken ${accessToken}`);
    

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")
    

    const options = {
        httpOnly : true,
        secure : true
    }

    res.status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {
                user:loggedInUser,accessToken,refreshToken
            },
            "user loggedIn successfully"
        )
    )


})

const userLogout = asyncHandler(async(req,res)=>{
    const user = await User.findByIdAndUpdate(
        req.user._id,
    {     
          
        $unset:{
            refreshToken:1 
        }    
    },
    {
        new:true
    });

    const options = {
        httpOnly:true,
        secure:true
    }

    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(
        200,
        {},
        "user logged out"
    ))
})

const acessRefreshToken = asyncHandler(async(req,res)=>{

    const incomingRefreshToken = req.cookies?.refreshToken || req.body.refreshToken;

    if(!incomingRefreshToken){
        throw new ApiError(400,"Unauthorized Request");
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET);
    
        const user  = await User.findById(decodedToken._id)
    
        if(!user)
        {
            throw new ApiError(400,"Invalid Token");
        }
    
        if(user.refreshToken!==incomingRefreshToken)
        {
            throw new ApiError(400,"Inavlid Token provided");
        }
    
        const{ refreshToken,accessToken } = await generateAcessTokenAndRefreshToken(user._id);
    
        
        const options ={
            httpOnly:true,
            secure:true
        }
    
        res
        .status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",refreshToken,options)
        .json(
            new ApiResponse(
                200,
                {refreshToken,accessToken},
                "accessToken Refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(400,error?.message || "Invalid refresh token")
    }

    

})

const changeCurrentPassword =  asyncHandler(async(req,res)=>{

    const { oldPassword,newPassword} = req.body;

    const user = await User.findById(req.user._id);

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if(!isPasswordCorrect)
    {
        throw new ApiError(400,"Old password is incorrect");
    }

    user.password = newPassword;

    await user.save({validateBeforeSave:false});

    return res
    .status(200)
    .json(
       new ApiResponse(200,"Password Changed Successfully")
    )

})


const getCurrentUser =  asyncHandler(async(req,res)=>{

    return res
    .status(200)
    .json(new ApiResponse(200,
        req.user,
        "User details fetched successfully"
    ))

});

const updateAccountDetails = asyncHandler(async(req,res)=>{
    const { email , fullName} = req.body;

    if(!email && !fullName){
        throw new ApiError(400,"All field are required")
    }

    const user = await User.findByIdAndUpdate(req.user._id,
        {
            $set:{
                fullName,
                email
            }
        },
        {
            new : true
        }
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200,user,"Account detail updated successfully"));

})

const updateAvatar = asyncHandler(async(req,res)=>{
    
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath)
    {
        throw new ApiError(400,"avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if(!avatar.url)
    {
        throw new ApiError(400,"Error while uploading on Cloudinary");
    }

    const user = await User.findById(req.user?._id,
        {
            avatar:avatar.url
        },
        {
            new:true
        }
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200,user,"Avatar Image uploaded successfully"))

})

const updatecoverImage = asyncHandler(async(req,res)=>{
    
    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath)
    {
        throw new ApiError(400,"avatar file is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!coverImage.url)
    {
        throw new ApiError(400,"Error while uploading on Cloudinary");
    }

    const user = await User.findById(req.user?._id,
        {
           coverImage:coverImage.url
        },
        {
            new:true
        }
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200,user,"Cover Image uploaded successfully"))

})

const getUserChannelProfile = asyncHandler(async(req,res)=>{
    
    const {username} = req.params

    if (!username?.trim()) {
        throw new ApiError(400, "username is missing")
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1

            }
        }
    ])

    if (!channel?.length) {
        throw new ApiError(404, "channel does not exists")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, channel[0], "User channel fetched successfully")
    )
})

const watchHistory = asyncHandler(async(req,res)=>{
     const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user[0].watchHistory,
            "Watch history fetched successfully"
        )
    )
})

export {

    registerUser,
    userLogin,
    userLogout,
    acessRefreshToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateAvatar,
    updatecoverImage,
    getUserChannelProfile,
    watchHistory

}
