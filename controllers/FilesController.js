import { ObjectId } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const fs = require('fs');

const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';

class FilesController {
  static async postUpload(req, res) {
    // check for x-token header
    const token = req.headers['x-token'];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    // verify token
    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const user = await dbClient.UsersCollection.findOne({ _id: ObjectId(userId) });

    // req handlers
    const fileTypes = ['folder', 'file', 'image'];
    const {
      name, type, parentId, isPublic, data,
    } = req.body;

    if (!name) return res.status(400).send({ error: 'Missing name' });
    if (!type || !fileTypes.includes(type)) return res.status(400).send({ error: 'Missing type' });
    if (!data && type !== 'folder') return res.status(400).send({ error: 'Missing data' });

    // create general folder if not exists
    if (!fs.existsSync(FOLDER_PATH)) {
      fs.mkdirSync(FOLDER_PATH, {
        recursive: true,
      });
    }

    // check for parentId
    if (parentId) {
      const fileExist = await dbClient.FilesCollection.findOne({ _id: ObjectId(parentId) });
      if (!fileExist) return res.status(400).send({ error: 'Parent not found' });
      if (fileExist.type !== 'folder') return res.status(400).send({ error: 'Parent is not a folder' });
    }

    // create folder records in db
    if (type === 'folder') {
      const newFolder = {
        userId: user._id,
        name,
        type,
        parentId: parentId || '0',
      };
      const result = await dbClient.FilesCollection.insertOne(newFolder);
      return res.status(201).json({
        id: result.insertedId,
        userId: user._id,
        name,
        type,
        isPublic: isPublic || false,
        parentId: parentId || 0,
      });
    }

    // Save local files
    const filename = uuidv4();
    const localPath = `${FOLDER_PATH}/${filename}`;
    const decodedData = Buffer.from(data, 'base64').toString();

    fs.writeFileSync(localPath, decodedData, (err) => {
      if (err) throw err;
    });

    // save file document in DB
    const newFile = {
      userId: user._id,
      name,
      type,
      isPublic: isPublic || false,
      parentId: parentId || '0',
      localPath,
    };

    const result = await dbClient.FilesCollection.insertOne(newFile);
    delete newFile.localPath;
    delete newFile._id;
    newFile.parentId = newFile.parentId === '0' ? 0 : newFile.parentId;
    return res.status(201).json({
      id: result.insertedId,
      ...newFile,
    });
  }
}

module.exports = FilesController;
