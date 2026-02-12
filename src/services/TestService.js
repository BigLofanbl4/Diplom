import BaseService from './BaseService';


export default class TestService extends BaseService {
  static async getById(id) {
    throw new Error(JSON.stringify({
      message: 'Test not Found',
      status: 404
    }))
  }
}