import DFWModule from "../lib/DFWModule";
import { promisify } from "util";
import { UploadedFile } from "express-fileupload";
import { DFW_FILE_STORAGE } from "@prisma/client";
import { DateTime } from "luxon";
import path from "path";
import DFWUtils from "../lib/DFWUtils";
import fs from "fs";
import { DFWCore } from "..";

export type SavedFileParams = {
    name?: string
    variant?: string
    expire?: Date
    idParent?: string
    url?: string
    storage?: DFW_FILE_STORAGE
}

class DFWFileModule extends DFWModule {

    createFileRecordAsync = async (file: UploadedFile, { name, url, storage, expire, idParent, variant }: SavedFileParams) => {
        return this.db.dfw_file.create({
            data: {
                name: name ?? file.name,
                size: file.size,
                mimetype: file.mimetype,
                checksum: file.md5,
                url,
                storage,
                expire,
                idParent,
                variant
            }
        })
    }

    saveFileLocalAsync = async (file: UploadedFile, params: SavedFileParams) => {
        const filePath = DateTime.now().toFormat("yyyy/MM")
        const fileName = DFWUtils.uuid()
        const ext = path.extname(file.name)
        const localPath = `${DFWCore.DFW_UPLOAD_DIR}/${filePath}`
        const localFilePath = `${localPath}/${fileName}${ext ?? ''}`
        
        const moveAsync = promisify(file.mv)

        fs.mkdirSync(localPath, { recursive: true })

        await moveAsync(localFilePath)

        return this.createFileRecordAsync(file, params)
    }

    generateTempFileName = (posfix?: string) => {
        return path.join(this.DFW.tmpDir, `${DFWUtils.uuid()}${posfix ?? ""}`);
    }
}

export default DFWFileModule