alter table public.site_settings
  alter column contact_email set default 'Merryland.mathura@gmail.com',
  alter column contact_phone set default '+91 9837349067';

update public.site_settings
set contact_email = 'Merryland.mathura@gmail.com',
    contact_phone = '+91 9837349067'
where id = 1;
