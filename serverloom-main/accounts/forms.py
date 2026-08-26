from django import forms
from django.contrib.auth.models import User
from core.models import Employee


class SignupForm(forms.ModelForm):
    username = forms.CharField(max_length=100)
    password = forms.CharField(widget=forms.PasswordInput)
    confirm_password = forms.CharField(widget=forms.PasswordInput)
    email = forms.EmailField(required=True)

    class Meta:
        model = Employee
        fields = [
            "name",
            "phone",
            "profile_picture",
            "pagdi_thread_1",
            "pagdi_thread_2",
            "warp_threads",
        ]

    def clean(self):
        cleaned_data = super().clean()
        password = cleaned_data.get("password")
        confirm = cleaned_data.get("confirm_password")

        if password != confirm:
            raise forms.ValidationError("Passwords no not match!")

        return cleaned_data
