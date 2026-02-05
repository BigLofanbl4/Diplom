from datetime import datetime, date


print(date.now())


today = datetime.now().date()
bday = datetime.strptime('2004-02-01', '%Y-%m-%d').date()
# if today.month > bday.month or (today.month == bday.month and today.day > bday.day):
#     age = today.year - bday.year
# else:
#     age = today.year - bday.year - 1
# print(age)
