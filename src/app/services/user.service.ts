import { Injectable } from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable()
export class UserService {

  baseUrl = environment.APIEndpoint;
  
  constructor(private http: HttpClient) { }

  // authenticating user
  authenticateUser(email, pass) {
      // returning server result to the component
      return this.http.post(`${this.baseUrl}/users/login`, {'email': email, 'password': pass} , {observe: 'response'});
  }

  // creating new user
  registerUser(email, pass, name) {
    // returning server result to the component
    return this.http.post(`${this.baseUrl}/users`, {'email': email, 'password': pass, 'name': name } , { observe: 'response'});
  }

  // verifying email
  verifyEmail(token) {
    const httpOptions = {
      responseType: 'text' as 'text'
    }
    // returning server result to the component
    return this.http.post(`${this.baseUrl}/users/verifyEmail`, {'token': token} , httpOptions);
  }

  getSharedFile(token){
    return this.http.get(`${this.baseUrl}/share/getsharedFile/${token}`);
  }

}



