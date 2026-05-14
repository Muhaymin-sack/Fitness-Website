import sqlite3


con = sqlite3.connect("Fitness.db")
cur = con.cursor()

# Tables for the Users in fitness center

cur.execute("Create Table If Not Exists User_table(User_id Integer Primary Key Autoincrement, Name Text, Age Integer, Gender Text)")

cur.execute("Create Table If Not Exists Admin_table(Admin_id Integer Primary Key Autoincrement, Name Text, Age Integer, Gender Text)")

cur.execute("Create Table If Not Exists Trainer_table(Trainer_id Integer Primary Key Autoincrement, Name Text, Age Integer, Gender Text)")

# Tables for the Classes and Bookings in fitness center

cur.execute("Create Table If Not Exists Class_table(Class_id Integer Primary Key Autoincrement, Name Text, Schedule Date, " \
            "Duration Integer, Trainer_id Integer, Admin_id Integer, Foreign Key(Trainer_id) References Trainer_table(Trainer_id), " \
            "Foreign Key(Admin_id) References Admin_table(Admin_id))")

cur.execute("Create Table If Not Exists Booking_table(Booking_id Integer Primary Key Autoincrement, Class_id Integer, " \
            "User_id Integer, Foreign Key(Class_id) References Class_table(Class_id), " \
            "Foreign Key(User_id) References User_table(User_id))")

cur.execute("Create Table If Not Exists Trainer_Availability_table(Availability_id Integer Primary Key Autoincrement, Schedule Date, " \
            "Duration Integer, Trainer_id Integer, Foreign Key(Trainer_id) References Trainer_table(Trainer_id))")

cur.execute("Create Table If Not Exists PersonalClass_table(PC_id Integer Primary Key Autoincrement," \
            "Workout_plan Text, User_id Integer, Availability_id Integer, Foreign Key(User_id) References User_table(User_id), " \
            "Foreign Key(Availability_id) References Trainer_Availability_table(Availability_id))")

# Tables for the Memeberships types in fitness center

cur.execute("Create Table If Not Exists Membership_table(Membership_id Integer Primary Key Autoincrement, " \
            "Tag Text, Card Name Text, Sub-Card Text, Price Text, Description Text, Icons Text)")

cur.execute ("""INSERT INTO Membership_table (Tag, Card Name, Sub-Card, Price, Description, Icons)
              
            VALUES
            (Starter, Basic, Beginners casual users, 
             <span class="amount" id="p-basic">25</span>, 
             <li><span class="yes">✔︎</span> Gym floor access (weights + cardio)</li>
                        <li><span class="yes">✔︎</span> Off-peak &amp; standard hours</li>
                        <li><span class="yes">✔︎</span> Changing rooms</li>
                        <li><span class="no">✖︎</span> Group classes</li>
                        <li><span class="no">✖︎</span> Locker access</li>
                        <li><span class="no">✖︎</span> Premium zones</li>),
             <svg viewBox="0 0 34 34" fill="none">
                            <rect x="4"  y="14" width="6" height="6" rx="1" fill="#6C757D"/>
                            <rect x="24" y="14" width="6" height="6" rx="1" fill="#6C757D"/>
                            <rect x="10" y="11" width="14" height="12" rx="1" fill="#6C757D"/>
                        </svg>),
             
            (Popular, Standard, Regular gym-goers, 
             <span class="amount" id="p-standard">45</span>,
             <li><span class="yes">✔︎</span> Full gym floor access</li>
                        <li><span class="yes">✔︎</span> All group classes included</li>
                        <li><span class="yes">✔︎</span> Full opening hours</li>
                        <li><span class="yes">✔︎</span> Locker access</li>
                        <li><span class="yes">✔︎</span> Free induction session</li>
                        <li><span class="no">✖︎</span> Premium zones</li>,
             <svg viewBox="0 0 34 34" fill="none">
                            <rect x="3"  y="13" width="7" height="8" rx="1" fill="#BA181B"/>
                            <rect x="24" y="13" width="7" height="8" rx="1" fill="#BA181B"/>
                            <rect x="10" y="10" width="14" height="14" rx="1" fill="#BA181B"/>
                        </svg>),

            (Elite, Premium, Comfort & full flexibility, 
             <span class="amount" id="p-premium">65</span>,
             <li><span class="yes">✔︎</span> Full gym + classes + premium zones</li>
                        <li><span class="yes">✔︎</span> Sauna, steam &amp; functional area</li>
                        <li><span class="yes">✔︎</span> Priority class booking</li>
                        <li><span class="yes">✔︎</span> Locker access</li>
                        <li><span class="yes">✔︎</span> 1 free guest passes / month</li>
                        <li><span class="yes">✔︎</span> Merch &amp; supplement discounts</li>
                        <li><span class="yes">✔︎</span> Dedicated locker</li>, 
             <svg viewBox="0 0 34 34" fill="none">
                            <polygon points="17,3 20,12 30,12 22,18 25,28 17,22 9,28 12,18 4,12 14,12" fill="#BA181B"/>
                        </svg>),
             
             (Student, Student, College & university members, 
             <span class="amount" id="p-student">20</span>, 
             <li><span class="yes">✔︎</span> Standard gym access + all classes</li>
                        <li><span class="yes">✔︎</span> Discounted rate (valid Student ID)</li>
                        <li><span class="yes">✔︎</span> Full opening hours</li>
                        <li><span class="yes">✔︎</span> Locker access</li>
                        <li><span class="no">✖︎</span> Guest passes</li>
                        <li><span class="no">✖︎</span> Premium zones</li>, 
             <svg viewBox="0 0 34 34" fill="none">
                            <path d="M17 5L3 12l14 7 14-7-14-7z" fill="#6C757D"/>
                            <path d="M7 15v7c0 3 4 6 10 6s10-3 10-6v-7" stroke="#6C757D" stroke-width="2" fill="none"/>
                        </svg>)`     """)

cur.execute("Create Table If Not Exists Users_Membership_table(UM_id Integer Primary Key Autoincrement, Start_date Date, " \
            "End_date Date, Payment_status Boolean, User_id Integer, Membership_id Integer, " \
            "Foreign Key(User_id) References User_table(User_id), Foreign Key(Membership_id) References Membership_table(Membership_id))")


con.commit()
con.close()
