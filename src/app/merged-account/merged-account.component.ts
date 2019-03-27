import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { AccountService } from '../services/account.service';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse, HttpEventType, HttpResponse } from '@angular/common/http';

import Swal from 'sweetalert2';

@Component({
  selector: 'app-merged-account',
  templateUrl: './merged-account.component.html',
  styleUrls: ['./merged-account.component.css']
})
export class MergedAccountComponent implements OnInit {

  files: any = [];
  loading = false;
  fileToUpload: File = null;
  uploadProgress = 0;
  accounts = [];
  breadCrumbs = [];

  @ViewChild('btnClose') btnClose: ElementRef;

  public barChartLabels = [];
  public barChartData = [];
  public barChartType = 'bar';
  public barChartOptions = {
    // We use these empty structures as placeholders for dynamic theming.
    title: {
      text: 'Storage Usage (GB)',
      display: true
    },
    scales: {
      yAxes: [{
          ticks: {
              // Include a dollar sign in the ticks
              callback: function(value, index, values) {
                  return value + ' GB';
              }
          }
      }]
  }
  };

  constructor(private account: AccountService, private route: Router) {
  }

  ngOnInit() {

    this.accounts = this.account.accounts;

    if (this.accounts.length === 0) {
      this.loading = true;
      this.account.getAccounts().subscribe((data: any) => {
        this.accounts = data;
        this.account.accounts = data;
        this.loading = false;
        this.getFiles();
        this.plotGraph();

      }, (err: any) => {
        this.loading = false;
        this.accounts = [];
        this.account.accounts = [];
      });
    } else {
      this.getFiles();
      this.plotGraph();
    }


  }

  getFiles() {
    this.loading = true;
    this.breadCrumbs = []
    this.account.getMergedAccountFiles().subscribe((mergedAccountFiles: any) => {
      mergedAccountFiles.forEach(mergedAccount => {
        this.files.push(...this.standarizeFileData(mergedAccount.files, mergedAccount.accountType, mergedAccount['_id']));
      });
      console.log('merged files', this.files);
      this.loading = false;
    }, (err: HttpErrorResponse) => {
      if (err.error === 'No account found!') {
        this.route.navigateByUrl('Dashboard/Accounts');
      } else {
        Swal.fire('Shame on us', err.error, 'error');
        console.log(err);
        console.log(err.name);
        console.log(err.message);
        console.log(err.status);
      }
    });

  }

  deleteFile(file) {
    Swal.fire({
      title: 'Are you sure?',
      text: 'You won\'t be able to revert this!',
      type: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
      if (result.value) {
        this.account.deleteFile(file.accountId, file.id, file.accountType).subscribe((data) => {
          this.files = this.files.filter((f) => f.id !== file.id);
          Swal.fire(
            'Deleted!',
            'Your file has been deleted.',
            'success'
          );
        });
      }
    });
  }

  getFolderItems(folder) {
    this.loading = true;

    // for maintaining breadCrumbs
    const currentFolder = this.files.filter((f) => {
      if (f.id === folder.id) {
        return f;
      }

    });

    this.account.getFiles(folder.accountId, folder.accountType, folder.id).subscribe((data) => {
      console.log(data);
      this.files = this.standarizeFileData(data, folder.accountType, folder.accountId);
      // console.log(this.files);
      if (currentFolder.length !== 0)
        this.breadCrumbs.push(currentFolder[0]);
      this.loading = false;
    });
  }

  getDownloadLink(file) {
    this.account.getDownloadUrl(file.accountId, file.id, file.accountType).subscribe((url: string) => {
      window.open(url['downloadUrl'], '_blank');
    }, (err: HttpErrorResponse) => {
      Swal.fire('Shame on us', 'Unable to download file', 'error');
      console.log(err);
      console.log(err.name);
      console.log(err.message);
      console.log(err.status);
    });
  }

  getDownloadStream(file){
    this.account.downloadStream(file._id, file.accountType).subscribe(blob =>{
      var link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = file.name;
      link.click();
    }, (err: HttpErrorResponse) => {
      Swal.fire('Shame on us', 'Unable to download file', 'error');
      console.log(err);
      console.log(err.name);
      console.log(err.message);
      console.log(err.status);
    });
  }

  handleFileInput(files: FileList) {
    this.fileToUpload = files.item(0);
  }

  uploadFile() {

    this.account.splitUpload(this.fileToUpload).subscribe((event: any) => {

      if (event.type === HttpEventType.UploadProgress) {
        this.uploadProgress = Math.round(100 * event.loaded / event.total);
      }

      else if (event instanceof HttpResponse) {
        console.log(event.body);
        this.files.push(event.body);
        this.btnClose.nativeElement.click();
        Swal.fire({
          type: 'success',
          title: 'Successful',
          text: 'File has been uploaded'
        });
        this.uploadProgress = 0;
      }
    }, (err: HttpErrorResponse) => {
      Swal.fire('Shame on us', 'Unable to upload file', 'error');
      this.uploadProgress = 0;
      console.log(err);
      console.log(err.name);
      console.log(err.message);
      console.log(err.status);
    });
  }

  // method for adding client drive
  addDrive(type) {
    localStorage.setItem('AddingAccountType', type);
    // calling accounts service method for adding a google drive account
    this.account.getAuthLink(type).subscribe((data) => {
      // opening a window for drive link for authentication
      window.open(data['url'], '_self');
    }, (err: HttpErrorResponse) => {
      Swal.fire('Shame on us', 'Server Not responding', 'error');
      console.log(err);
      console.log(err.name);
      console.log(err.message);
      console.log(err.status);
    });
  }

  getSizeInMb(size) {
    if (isNaN(size))
      return '-';

    return (Number(size) / Math.pow(1024, 2)).toFixed(2) + ' MB';
  }

  getModifiedTime(isoTime) {
    if (isoTime != '-')
      return new Date(isoTime).toLocaleString();
    return '-';
  }

  getSizeInGb(size) {
    return (size / Math.pow(1024, 3)).toFixed(2);
  }

  standarizeFileData = (items, accountType, accountId) => {

    var standarizedItems = [];

    if (accountType === 'gdrive') {

      items.forEach(item => {

        if (item.mimeType === 'application/vnd.google-apps.folder')
          item['mimeType'] = 'folder';

        item['accountType'] = 'gdrive';
        item['account'] = 'Google Drive';
        item['accountId'] = accountId;
        standarizedItems.push(item);

      });

    }

    if (accountType === 'odrive') {

      items.forEach(item => {
        // item has a file property if its a file and a folder property if its a folder
        item.file ? item['mimeType'] = item.file.mimeType : item['mimeType'] = 'folder';
        item.lastModifiedDateTime ? item['modifiedTime'] = item.lastModifiedDateTime : item['modifiedTime'] = '-';
        item['accountType'] = 'odrive';
        item['account'] = 'OneDrive';
        item['accountId'] = accountId;
        standarizedItems.push(item);
      });

    }

    if (accountType === 'merged') {
      items.forEach(item => {
        item['accountType'] = 'merged';
        item['account'] = 'Merged';
        standarizedItems.push(item);
      });
    }

    if (accountType === 'dropbox') {

      items.entries.forEach(item => {
        if (item['.tag'] === 'folder')
          item['mimeType'] = 'folder';
        else
          item['mimeType'] = item.name.split('.')[1];

        if (!item['client_modified'])
          item['client_modified'] = '-';

        standarizedItems.push({
          id: item.id,
          name: item.name,
          mimeType: item['mimeType'],
          size: item.size,
          modifiedTime: item['client_modified'],
          accountType: 'dropbox',
          account: 'Dropbox',
          accountId: accountId
        });
      });

    }
    return standarizedItems;
  };

  plotGraph() {

    console.log(this.accounts)
    let usedDataSet = [];
    let totalDataSet = [];
    let total = 0;
    let used = 0;
    this.accounts.forEach((value) => {
      this.barChartLabels.push(`${value.account}(${value.email.split('@')[0]})`);
      usedDataSet.push(this.getSizeInGb(value.storage.used));
      totalDataSet.push(this.getSizeInGb(value.storage.total));
      total += parseInt(value.storage.total);
      used += parseInt(value.storage.used);
    });

    this.barChartLabels.push('Infinity Drive');
    usedDataSet.push(this.getSizeInGb(used));
    totalDataSet.push(this.getSizeInGb(total));

    this.barChartData= [
      { data: usedDataSet, label: 'Used' },
      { data: totalDataSet, label: 'Total' }
    ];

  }

  // handling breadcrumb navigation
  breadCrumbNavigation(folder, index) {
    this.getFolderItems(folder)
    this.breadCrumbs.splice(index + 1);
  }

}
