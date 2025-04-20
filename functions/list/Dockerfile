FROM public.ecr.aws/lambda/python:3.13-arm64

COPY requirements.txt .
RUN pip install -r requirements.txt --target .

COPY app.py .

# Set the CMD to execute the handler function
CMD ["app.lambda_handler"]
