import { Component, OnInit } from '@angular/core';
import { AccountService } from '../services/account.service';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-files',
  templateUrl: './files.component.html',
  styleUrls: ['./files.component.css']
})
export class FilesComponent implements OnInit {

  files;
  accountId;
  currentAccount;
  // user accounts array
  accounts = [];
  fileToUpload: File = null;

  constructor(private account: AccountService, private activeRoute: ActivatedRoute) {
  }

  ngOnInit() {
    this.activeRoute.params.subscribe((params) => {
      this.accountId = params.id;
      this.account.accountsObservable.subscribe(data => this.accounts = data);
      this.currentAccount = this.accounts.find(account => account['_id'] === this.accountId);
      this.getfiles(params.id);
    });
  }

  getfiles(id) {
    this.account.getFiles(id, this.currentAccount['accountType']).subscribe((data) => {
      console.log(data);
      this.files = this.standarizeFileData(data, this.currentAccount['accountType']);
      // console.log(this.files);
    });
  }


  getDownloadLink(Fileid) {
    this.account.getDownloadUrl(this.accountId, Fileid, this.currentAccount['accountType']).subscribe((url: string) => {
      window.open(url['downloadUrl'], '_blank');
    });
  }

  getFolderItems(folderId){
    this.account.getFiles(this.accountId, this.currentAccount['accountType'], folderId).subscribe((data) => {
      console.log(data);
      this.files = this.standarizeFileData(data, this.currentAccount['accountType']);
      // console.log(this.files);
    });
  }

  deleteFile(Fileid) {
    this.account.deleteFile(this.accountId, Fileid, this.currentAccount['accountType']).subscribe((data) => {
      this.getfiles(this.accountId);
    });
  }

  handleFileInput(files: FileList) {
    this.fileToUpload = files.item(0);
  }

  uploadFile() {
    this.account.uploadFile(this.accountId, this.currentAccount['accountType'], this.fileToUpload).subscribe((url: string) => {
      this.getfiles(this.accountId);
    });
  }

  getSizeInMb(size){
    if (isNaN(size))
      return '-';
    else
      return (Number(size)/Math.pow(1024,2)).toFixed(2) + ' MB';
  }

  standarizeFileData = (items, accountType) => {

    console.log(items);

    var standarizedItems = [];

    if (accountType === 'gdrive') {

      items.forEach(item => {

        if (item.mimeType === 'application/vnd.google-apps.folder')
          item['mimeType'] = 'folder';

        standarizedItems.push(item);

      });

    }

    if (accountType === 'odrive') {

      items.forEach(item => {
        //item has a file property if its a file and a folder property if its a folder
        item.file ? item['mimeType'] = item.file.mimeType : item['mimeType'] = 'folder';
        item.lastModifiedDateTime ? item['modifiedTime'] = item.lastModifiedDateTime : item['modifiedTime'] = '-';
        standarizedItems.push(item);
      });

    }

    if (accountType === 'dropbox') {

      items.entries.forEach(item => {
        if (item['.tag'] === 'folder')
          item['mimeType'] = 'folder'
        else
          item['mimeType'] = item.name.split('.')[1];

        if(!item['client_modified'])
          item['client_modified'] = '-';
          
        standarizedItems.push({ 
          id: item.id, 
          name: item.name, 
          mimeType: item['mimeType'], 
          size: item.size,
          modifiedTime: item['client_modified']
        });
      });

    }
    console.log(standarizedItems);
    return standarizedItems;
  }

}
