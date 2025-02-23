export interface UserCompanyTxn {
    UserCompanyTxnID: number;
    UserID: number;
    ClientAccountTypeID: number;
    FromEmailID: number;
    IsActive: boolean;
    IsDefaultLogin: boolean;
    FromDecative: boolean;
    CompanyID: number;
    CompanyName: string;
    CompanyCode: string;
    FromEmail: string;
    SMTPUserName: string;
    SMTPPassword: string;
    SMTPServerName: string;
}

export interface UserSettings {
    IsTwoStepVerify: boolean;
    IsTwoStepEnable: boolean;
    UserEmail: string;
    UserID: string;
    RoleID: number;
    CompanyID: number;
    CompanyName: string;
    CompanyCode: string;
    ClientAccountTypeID: number;
    FromEmailID: number;
    RemoteAccess: boolean;
    IsCallScriptEnabled: boolean;
    ClientID: number;
    DisplayUserName: string;
    DisplayClientAccount: string;
    Designation: string;
    Extension: string;
    CellPhone: string;
    WorkPhone: string;
    FromEmail: string;
    SMTPServerName: string;
    SMTPUserName: string;
    SMTPPassword: string;
    SMTPPort: number;
    IsSSLRequired: boolean;
    TotalAccount: number;
    IsSurveySubmit: number;
    Monster: boolean;
    CareerBuilder: boolean;
    NotificationKey: string | null;
    userCompanyTxn: UserCompanyTxn[];
}
