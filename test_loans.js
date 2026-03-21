const mongoose = require('mongoose');
const Loan = require('./server/models/Loan');
const Member = require('./server/models/Member');
const Account = require('./server/models/Account');

async function test() {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/society');
        console.log("Connected to DB");
        
        const loans = await Loan.find().sort({ created_at: -1 }).populate('account_id', 'account_no').lean();
        console.log("Loans found in DB:", loans.length);
        
        if (loans.length > 0) {
           console.log("First loan sample:", loans[0]);
        }
        
        const result = await Promise.all(loans.map(async (loan) => {
            if (!loan.account_id) {
                console.log("Found loan with no account_id:", loan._id);
                return { ...loan, account_no: 'Deleted' };
            }
            try {
                const member = await Member.findOne({ account_id: loan.account_id._id }).sort('position').lean();
                return { ...loan, account_no: loan.account_id.account_no, member: member ? member.name : 'Unknown' };
            } catch(subErr) {
                console.error("Error finding member for loan:", loan._id, subErr);
                throw subErr;
            }
        }));
        
        console.log("Success! Mapped loans:", result.length);
    } catch(e) { 
        console.error("Crash caught by test:", e); 
    } finally {
        await mongoose.disconnect();
    }
}
test();
