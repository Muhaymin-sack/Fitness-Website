from flask import Flask, render_template, redirect, request, flash, session, url_for
import sqlite3
from flask_bcrypt import Bcrypt
from flask_login import LoginManager, UserMixin, login_required, login_user, current_user, logout_user
app = Flask(__name__)

bcrypt = Bcrypt(app)
login_manager = LoginManager(app)

app.secret_key = "66*dj7" # The reason for defining is to able to use flash messages
login_manager.login_view = "login" # The reason for defining is to able search for the function route login



def database_connection():
    con = sqlite3.connect("Fitness.db")
    cur = con.cursor()
    return con, cur

def check_both_password(password, confirm_password):
    """ If both passwords are identical then gives a Pass. If not then displays a messages and returns back to sign in page """
    if password == confirm_password:
        return True
    else:
        flash("Passwords do not match. Please ensure both fields are identical.")
        return redirect(url_for("sign_up"))

################################################################### Classes

class User(UserMixin):
    """ This class is used to store the user details"""
    def __init__(self, id, name, account_type, email, password):
        super().__init__()
        self.id = id
        self.name = name
        self.account_type = account_type
        self.email = email
        self.password = password
    def get_id(self):
        return f"{self.account_type}:{self.id}"
    

@login_manager.user_loader
def load_user(id):
    """ This function is used for automatically logging in the system"""
    account_type, id = id.split(":", 1)
    con, cur = database_connection()
    print(account_type)
    print(id)
    if account_type == "trainers"or account_type == "Trainer"or account_type == "Trainer_table":
        account_type = "Trainer"
    elif account_type == "members" or account_type == "User" or account_type == "User_table":
        account_type = "User"
    else:
        account_type = "Admin"
    cur.execute(f"Select * From {account_type}_table Where {account_type}_Id=(?)", (id,))
    row = cur.fetchone()
    con.commit()
    con.close()
    print(row)

    if row is None:
        flash("Email not found. Please check your email or sign up for an account.")
        return redirect(url_for('login'))
    else:
        return User(row[0], row[1], account_type, row[4], row[5])


@app.route("/Sign-up", methods=['GET', 'POST'])
def sign_up():
    """ This function allows the users to create their account and insert it in the database. """
    # Once the user sends form, stores details in the variables so they can be
    # sent to the function
    if request.method == "POST":
        # get the inputs from sign-in page
        name = request.form.get('name')
        account_type = request.form.get('account_type')
        email = request.form.get('email')
        password = request.form.get('password')
        confirm_password = request.form.get('confirm-password')
        print(account_type, password, confirm_password)
        # check if the user already exists if not then it creates an account
        # otherwise it won't allow the person to create a second account
        if account_type == "trainers"or account_type == "Trainer_table":
            account_type = "Trainer_table"
        elif account_type == "members" or account_type == "User_table":
            account_type = "User_table"
        else:
            account_type = "Admin_table"
        con, cur = database_connection()
        cur.execute(f"SELECT Email FROM {account_type} WHERE Email=(?)", (email,))
        row = cur.fetchone()
        con.commit()
        con.close()

        if row == None:
            search = False
        else:
            search = True


        if search == False:
            # check if the there is empty space
            if name == " ":
                flash("Please make sure that you fill out all details correctly.")
                return redirect(url_for("sign_up"))
            # checks if passwords entered are both the same
            if check_both_password(password, confirm_password):
                encrypted_password = bcrypt.generate_password_hash(password).decode("utf-8") 
            # then we insert the user_detials
            con, cur = database_connection()
            cur.execute(f"Insert Into {account_type} (Name, Email, Password) Values (?, ?, ?)", (name, email, encrypted_password))
            con.commit()
            con.close()
            flash("Account created successfully! Before you procced use the account to login")
            return redirect(url_for('login'))
        else:
            flash("Sorry, this account is already taken")
    return render_template('register.html')


@app.route("/login", methods=['GET', 'POST'])
def login():
    """ This function allows the users to login to the website using their account. """
    # Once the user sends form it check whether is authenticated to use their account
    if request.method == "POST":
        if current_user.is_authenticated:
            flash('Welcome back!')
            return redirect(url_for('home'))
        
        # if not, then it goes through series of checks 
        else:
            # Retieves the values from the form
            account_type = request.form.get('account_type')
            email = request.form.get('email')
            password = request.form.get('password')
            remember = bool(request.form.get('remember'))

            if account_type == "trainers"or account_type == "Trainer_table":
                account_type = "Trainer_table"
            elif account_type == "members" or account_type == "User_table":
                account_type = "User_table"
            else:
                account_type = "Admin_table"

            con, cur = database_connection()
            cur.execute(f"Select * From {account_type} Where Email=(?)", (email,))
            row = cur.fetchone()
            con.commit()
            con.close()
            print(row)

            if row is not None:
                
                access = bcrypt.check_password_hash(row[-1], password)
                print(access)
                if access is True:
                    user_details = User(row[0], row[1], account_type, row[4], row[5]) # Store the users details in the User class            
                    login_user(user_details, remember)
                    flash("You have successfully logged in.")
                    return redirect(url_for('home'))
                else:
                    flash("Incorrect email or password. Please try again.")
                    return redirect(url_for('login'))
            else:
                flash("Email not found. Please check your email or sign up for an account.")
                return redirect(url_for('login'))
    
    return render_template('login.html')


@app.route("/logout")
def logout():
    """ This function is used logout the permanently from the website"""
    logout_user()
    return redirect(url_for('home'))

@app.route("/")
def home():
    return render_template("home.html")

@app.route("/store")
def store():
    pass

@app.route("/memberships")
def membership():
    
    con, cur = database_connection()
    cur.execute("Select * from Membership_table")
    memberships = cur.fetchall()
    con.close()
    cards = memberships

    return render_template("membership_page.html", cards=cards)

@app.route("/class")
def classes():
    pass

@app.route("/Personal-Training")
def personal_training():
    pass

@app.route("/Trainer-dashboard")
def trainer_dashboard():
    pass


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)