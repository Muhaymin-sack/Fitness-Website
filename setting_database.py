import sqlite3


con = sqlite3.connect("Fitness.db")
cur = con.cursor()

cur.execute("Create Table If Not Exists User_table(User_id Integer Primary Key Autoincrement, Name Text, Age Integer, Gender Text)")

cur.execute("Create Table If Not Exists Membership_table(Membership_id Integer Primary Key Autoincrement, " \
            "Name Text, Price Integer, Description Text)")

cur.execute("Create Table If Not Exists Trainer_table(Trainer_id Integer Primary Key Autoincrement, Name Text, Age Integer, Gender Text)")

cur.execute("Create Table If Not Exists Class_table(Class_id Integer Primary Key Autoincrement, Name Text, Schedule Date, " \
            "Duration Integer, Trainer_id Integer, Foreign Key(Trainer_id) References Trainer_table(Trainer_id))")

cur.execute("Create Table If Not Exists Booking_table(Booking_id Integer Primary Key Autoincrement, Class_id Integer, " \
            "User_id Integer, Foreign Key(Class_id) References Class_table(Class_id), " \
            "Foreign Key(User_id) References User_table(User_id))")

cur.execute("Create Table If Not Exists PersonalClass_table(PC_id Integer Primary Key Autoincrement, Schedule Date, " \
            "Duration Integer, Trainer_id Integer, User_id Integer, Foreign Key(Trainer_id) References Trainer_table(Trainer_id)," \
            " Foreign Key(User_id) References User_table(User_id))")

cur.execute("Create Table If Not Exists Users_Membership_table(UM_id Integer Primary Key Autoincrement, Start_date Date, " \
            "End_date Date, Payment_status Boolean, User_id Integer, Membership_id Integer, " \
            "Foreign Key(User_id) References User_table(User_id), Foreign Key(Membership_id) References Membership_table(Membership_id))")

con.commit()
con.close()
