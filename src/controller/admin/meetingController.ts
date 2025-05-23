import { Request , Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { MeetingType } from "../../model/admin/meetingModel";
import AdminService from "../../services/admin/Implimentation/adminService";
import { ExpertDocument } from "../../model/expert/expertModel";
import IMeetingService from "../../services/admin/IMeetingService";
import IAdminService from "../../services/admin/IAdminService";
import { STATUS_CODES } from "../../constants/statusCode";
import { ERROR_MESSAGES } from "../../constants/errorMessage";
import { CustomResponse } from "../../utils/customResponse";
import { SUCESS_MESSAGE } from "../../constants/sucessMessage";
class MeetingController{
    private meetingService : IMeetingService;
    private adminService : IAdminService;
    constructor(meetingService: IMeetingService, adminService : IAdminService){
        this.meetingService = meetingService
        this.adminService =  adminService
    }
    async createMeeting(req:Request , res: Response):Promise<void>{
        const { expertId, title, meetingDate } =  req.body
        const meetingId  =  uuidv4()
        try {
            const createMeet =  await this.meetingService.createMeeting({meetingId,
                title,
                userId: expertId,
                dateTime:meetingDate} as MeetingType)
                if(createMeet){
                    const isMeetingScheduled = 1;
                    const updateExpert =  await this.adminService.updateExpertById(expertId,{isMeetingScheduled} as ExpertDocument)
                    res.status(STATUS_CODES.OK).json({status: true, message: SUCESS_MESSAGE.CREATION_SUCESS, data:createMeet} as CustomResponse<ExpertDocument>)
                    return;
                }
                else
                res.status(STATUS_CODES.BAD_REQUEST).json({status: false, message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR} as CustomResponse<null>)

        } catch (error) {
            res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ status: false, message:ERROR_MESSAGES.INTERNAL_SERVER_ERROR} as CustomResponse<null>)
        }

    }

    async getMeetingDetails(req:Request, res: Response):Promise<void>{
        let { page = 1 , status =0 } =  req.body;
        try {
            const meetingData =  await this.meetingService.getMeetingData(page, status)
            if(meetingData){
                const totalCount = await this.meetingService.getMeetingCount(status)
                const pageCount = Math.ceil(totalCount/10)
                res.status(STATUS_CODES.OK).json({status: true, message : SUCESS_MESSAGE.DATA_FETCH_SUCESS, data:meetingData, count:totalCount, totalPages: pageCount})
                return
            }
           res.status(STATUS_CODES.BAD_REQUEST).json({status : false , message : ERROR_MESSAGES.NOT_FOUND} as CustomResponse<null>) 
        } catch (error:any) {
           res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({status : false , message : ERROR_MESSAGES.INTERNAL_SERVER_ERROR} as CustomResponse<null>) 
        }
    }   

    async approveExpert(req:Request, res:Response):Promise<void>{
        try {
            const {expertId,meetingId , status} =  req.body;
            const updateExpert = await this.adminService.updateExpertById(expertId,{status,isMeetingScheduled:0,isVerified:1} as ExpertDocument)
            if(updateExpert){
                const updateMeeting  =  await this.meetingService.updateMeetingByExpertId(expertId,meetingId)
                if(updateMeeting){
                    res.status(STATUS_CODES.OK).json({status: true, message : SUCESS_MESSAGE.EXPERT_APPROVED} as CustomResponse<null>)
                    return;
                }
            }
            res.status(STATUS_CODES.BAD_REQUEST).json({status: true, message : ERROR_MESSAGES.UPDATION_FAILED} as CustomResponse<null>)
        } catch (error) {
            res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({status:false, message:ERROR_MESSAGES.INTERNAL_SERVER_ERROR} as CustomResponse<null>)
        }
    }
    
}

export default MeetingController