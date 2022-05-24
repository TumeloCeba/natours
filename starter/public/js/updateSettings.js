import axios from 'axios';
import { showAlert } from './alerts';

//type is either 'password' or 'data'
export const updateSettings = async (data, type) => {
  try{

    const url = 
      type === 'password' 
        ? '/api/v1/users/updateMyPassword' 
        : '/api/v1/users/updateMe';

    const response = await axios({
      method: 'PATCH',
      url,
      data
    });
 
    if(response.data.status === 'success'){
      showAlert('success', `${type.toUpperCase()} Updated successfully`);

      //the true makes it reload from the server
      //location.reload(true);
    }
  } catch(error){
    showAlert('error', error.response.data.message);
  }
}