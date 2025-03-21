import { Request, Response } from "express";
import UserService from "../../services/user/Implimentation/userServices";
import { UserType } from "../../model/user/userModel";
import { uploadImageToCloudinary } from "../../utils/uploadImageToCloudinary ";
import {STATUS_CODES } from '../../constants/statusCode'
import { ERROR_MESSAGES } from "../../constants/errorMessage";

class ProfileController {
  private profileService: UserService;
  constructor(userService: UserService) {
    this.profileService = userService;
  }
  async getProfile(req: Request | any, res: Response): Promise<void> {
    const email = req.user;
    if (email) {
      try {
        const userData = await this.profileService.findByEmail(email);
        if (userData?.status === 1) {
          res.status(STATUS_CODES.OK).json({
            status: true,
            message: "User data fetched successfully",
            data: userData,
          });
        } else {
          res.status(STATUS_CODES.BAD_REQUEST).json({
            status: false,
            message: "User is blocked.",
            data: null,
          });
        }
      } catch (error) {
        console.error("Error retrieving profile:", error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
          status: false,
          message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
          data: null,
        });
      }
    } else {
      res.status(STATUS_CODES.BAD_REQUEST).json({
        status: false,
        message: ERROR_MESSAGES.UNAUTHORIZED,
        data: null,
      });
    }
  }

  async updateProfile(req: Request | any, res: Response): Promise<void> {
    const { _id, ...data } = req.body;
    const file  = req.file
    if (!_id) {
      res
        .status(STATUS_CODES.BAD_REQUEST)
        .json({
          status: false,
          message:ERROR_MESSAGES.UNAUTHORIZED,
          data: null,
        });
      return;
    }

    try {
      let profilePictureUrl = data.profilePicture;
            
            if (file) {
                console.log("File Details:", {
                    fieldname: file.fieldname,
                    originalname: file.originalname,
                    mimetype: file.mimetype,
                    size: file.size
                });
                
                const cloudinaryUrl = await uploadImageToCloudinary(file.buffer);
                profilePictureUrl = cloudinaryUrl; 
            }
      

      const updateData = {
        qualification: data.qualification
          ? [{ qualification: data.qualification, college: data.college }]
          : undefined,
        address: data.address ?? undefined,
        experiance: data.totalExperience ?? undefined,
        job_title: data.currentJobTitle ?? undefined,
        occupation: data.occupation ?? undefined,
        employer: data.employer ?? undefined,
        start_date: data.startDate ? new Date(data.startDate) : undefined,
        end_date: data.endDate ? new Date(data.endDate) : undefined,
        first_name: data.firstName ?? undefined,
        last_name: data.lastName ?? undefined,
        status: data.status ?? undefined,
        skills: data.skills ?? undefined,
        profilePicture:profilePictureUrl,
      };

      Object.keys(updateData).forEach((key) => {
        const typedKey = key as keyof typeof updateData;
        if (updateData[typedKey] === undefined) {
          delete updateData[typedKey];
        }
      });

      const updateUser = await this.profileService.updateUserById(
        _id,
        updateData as UserType
      );

      if (updateUser) {
        res
          .status(STATUS_CODES.OK)
          .json({
            status: true,
            message: "Profile updated successfully",
            data: updateUser,
          });
      } else {
        res
          .status(STATUS_CODES.NOT_FOUND)
          .json({ status: false, message: ERROR_MESSAGES.NOT_FOUND, data: null });
      }
    } catch (error) {
      console.error("Error while updating", error);
      res
        .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
        .json({ status: false, message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR, data: null });
    }
  }

  async getExpertProfile(req:Request , res:Response):Promise<void>{
    const {id} = req.params
    try {
      if(!id){
        res.status(STATUS_CODES.BAD_REQUEST).json({status:false, message:ERROR_MESSAGES.INVALID_INPUT});
        return
      }
      const expertData =  await this.profileService.getExpertById(id)
      if(expertData){
        res.status(STATUS_CODES.OK).json({status: true , message:"profile fetched successfully", data : expertData})
        return
      }
      res.status(STATUS_CODES.BAD_REQUEST).json({status: false , message:"User is not active with this id"})

    } catch (error) {
      res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({status:false, message:ERROR_MESSAGES.INTERNAL_SERVER_ERROR});
    }
  }
  
}
 
export default ProfileController;
